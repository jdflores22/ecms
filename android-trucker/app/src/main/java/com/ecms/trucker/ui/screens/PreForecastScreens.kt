package com.ecms.trucker.ui.screens

import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.transformable
import androidx.compose.foundation.gestures.rememberTransformableState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.ReportProblem
import androidx.compose.material.icons.filled.ZoomIn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.ecms.trucker.BuildConfig
import com.ecms.trucker.EcmsTruckerApp
import com.ecms.trucker.R
import com.ecms.trucker.data.local.AuthState
import com.ecms.trucker.data.model.*
import com.ecms.trucker.data.repository.TruckerRepository
import com.ecms.trucker.ui.components.*
import com.ecms.trucker.ui.theme.IcsColors
import com.ecms.trucker.ui.util.rememberScreenLoadState
import coil.compose.AsyncImage
import coil.request.ImageRequest
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PreForecastListScreen(
    repository: TruckerRepository,
    onItemClick: (Int) -> Unit,
    onNewClick: () -> Unit,
    onBack: (() -> Unit)? = null,
) {
    val cachedItems = PreForecastListCache
        ?.takeIf { System.currentTimeMillis() - it.updatedAtMs <= PREFORECAST_LIST_CACHE_TTL_MS }
        ?.items
        ?: emptyList()
    val loadState = rememberScreenLoadState(initiallyLoading = cachedItems.isEmpty())
    var items by remember { mutableStateOf(cachedItems) }
    var photoProgressById by remember { mutableStateOf<Map<Int, Int>>(emptyMap()) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun load(force: Boolean = false) {
        scope.launch {
            loadState.begin(items.isNotEmpty())
            if (!force) {
                PreForecastListCache
                    ?.takeIf { System.currentTimeMillis() - it.updatedAtMs <= PREFORECAST_LIST_CACHE_TTL_MS }
                    ?.let { entry ->
                        items = entry.items
                        loadState.end()
                        return@launch
                    }
            }
            runCatching { repository.listPreAdvices() }
                .onSuccess { list ->
                    items = list
                    PreForecastListCache = PreForecastListCacheEntry(
                        items = list,
                        updatedAtMs = System.currentTimeMillis(),
                    )
                    val now = System.currentTimeMillis()
                    val cached = list.mapNotNull { item ->
                        PreForecastPhotoProgressCache[item.id]
                            ?.takeIf { now - it.updatedAtMs <= PHOTO_PROGRESS_CACHE_TTL_MS }
                            ?.let { entry -> item.id to entry.uploadedRequired }
                    }.toMap()
                    photoProgressById = cached
                    list.forEach { preAdvice ->
                        if (cached.containsKey(preAdvice.id)) return@forEach
                        launch {
                            runCatching { repository.getPreAdviceDocuments(preAdvice.id) }
                                .onSuccess { docs ->
                                    val uploadedRequired = REQUIRED_PHOTO_CATEGORY_VALUES.count { key ->
                                        docs.any { it.category == key }
                                    }
                                    PreForecastPhotoProgressCache[preAdvice.id] = PhotoProgressCacheEntry(
                                        uploadedRequired = uploadedRequired,
                                        updatedAtMs = System.currentTimeMillis(),
                                    )
                                    photoProgressById = photoProgressById + (preAdvice.id to uploadedRequired)
                                }
                        }
                    }
                }
                .onFailure { error = it.message }
            loadState.end()
        }
    }
    LaunchedEffect(Unit) { load(force = cachedItems.isEmpty()) }

    IcsScreenScaffold(
        title = stringResource(R.string.home_preforecast),
        onBack = onBack,
        refreshing = loadState.refreshing,
        onRefresh = { load(force = true) },
        floatingActionButton = {
            IcsFab(onClick = onNewClick) {
                Icon(Icons.Default.Add, contentDescription = stringResource(R.string.content_desc_new))
            }
        },
    ) { padding ->
        when {
            loadState.loading -> LoadingBox(Modifier.padding(padding))
            error != null -> ErrorMessage(error!!, { load() }, Modifier.padding(padding))
            items.isEmpty() -> EmptyState(stringResource(R.string.preforecast_empty), Modifier.padding(padding))
            else -> LazyColumn(Modifier.padding(padding), contentPadding = PaddingValues(vertical = 8.dp)) {
                items(items) { item ->
                    val uploaded = photoProgressById[item.id]
                    PreForecastListRowCard(
                        title = item.referenceNo,
                        subtitle = "${item.containerNo} · ${item.shippingLineName}",
                        status = item.status,
                        uploaded = uploaded,
                        total = REQUIRED_PHOTO_CATEGORY_VALUES.size,
                        onClick = { onItemClick(item.id) },
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PreForecastDetailScreen(
    id: Int,
    repository: TruckerRepository,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val app = context.applicationContext as EcmsTruckerApp
    val authState by app.container.tokenStore.authState.collectAsState(initial = AuthState())
    val accessToken = authState.accessToken
    val loadState = rememberScreenLoadState(initiallyLoading = true)
    var item by remember { mutableStateOf<PreAdviceDto?>(null) }
    var docs by remember { mutableStateOf<List<PreAdviceDocumentDto>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }
    var actionLoading by remember { mutableStateOf(false) }
    var uploadCategory by remember { mutableStateOf<ContainerPhotoCategory?>(null) }
    var damageTarget by remember { mutableStateOf<ContainerPhotoCategory?>(null) }
    var damageDescription by remember { mutableStateOf("") }
    var damageImageUri by remember { mutableStateOf<Uri?>(null) }
    var preview by remember { mutableStateOf<PreAdviceDocumentDto?>(null) }
    var deleteConfirm by remember { mutableStateOf<PreAdviceDocumentDto?>(null) }
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    val photoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        if (uri == null) {
            Toast.makeText(context, "Image selection cancelled", Toast.LENGTH_SHORT).show()
            return@rememberLauncherForActivityResult
        }
        val category = uploadCategory ?: return@rememberLauncherForActivityResult
        Toast.makeText(context, "Uploading photo...", Toast.LENGTH_SHORT).show()
        scope.launch {
            actionLoading = true
            runCatching { repository.uploadPreAdviceDocument(id, uri, category.value, null) }
                .onSuccess {
                    docs = repository.getPreAdviceDocuments(id)
                    snackbarHostState.showSnackbar("Photo uploaded")
                    Toast.makeText(context, "Photo uploaded", Toast.LENGTH_SHORT).show()
                }
                .onFailure {
                    error = it.message
                    snackbarHostState.showSnackbar(it.message ?: "Failed to upload photo")
                    Toast.makeText(context, it.message ?: "Failed to upload photo", Toast.LENGTH_LONG).show()
                }
            actionLoading = false
            uploadCategory = null
        }
    }

    val damagePhotoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        damageImageUri = uri
        if (uri != null) {
            Toast.makeText(context, "Damage image selected", Toast.LENGTH_SHORT).show()
        } else {
            Toast.makeText(context, "Image selection cancelled", Toast.LENGTH_SHORT).show()
        }
    }

    fun load() {
        scope.launch {
            loadState.begin(item != null)
            runCatching {
                item = repository.getPreAdvice(id)
                docs = repository.getPreAdviceDocuments(id)
            }.onFailure { error = it.message }
            loadState.end()
        }
    }
    LaunchedEffect(id) { load() }

    IcsScreenScaffold(
        title = stringResource(R.string.preforecast_detail_title),
        onBack = onBack,
        refreshing = loadState.refreshing,
        onRefresh = { load() },
        snackbarHost = { _ -> SnackbarHost(hostState = snackbarHostState) },
    ) { padding ->
        when {
            loadState.loading && item == null -> LoadingBox(Modifier.padding(padding))
            error != null && item == null -> ErrorMessage(error!!, { load() }, Modifier.padding(padding))
            item != null -> {
                val p = item!!
                val isDraft = p.status.equals("Draft", true)
                val isForCompliance = p.status.equals("ForCompliance", true)
                val isSubmitted = p.status.equals("Submitted", true)
                val canManagePhotos = isDraft || isForCompliance || isSubmitted
                val canSubmit = isDraft || isForCompliance
                val docsByCategory = docs.associateBy { it.category.orEmpty() }
                val damageByView = docs
                    .filter { it.category == DAMAGE_PHOTO_CATEGORY }
                    .mapNotNull { doc -> parseDamageView(doc.comment)?.let { it to doc } }
                    .toMap()
                val requiredCategories = CONTAINER_PHOTO_GRID_CATEGORIES.filter { it.required }
                val uploadedRequired = requiredCategories.count { docsByCategory[it.value] != null }
                val photosTotal = requiredCategories.size
                val photosComplete = uploadedRequired == photosTotal
                val missing = requiredCategories.filter { docsByCategory[it.value] == null }
                var missingPhotoLabels = ""
                for (i in missing.indices) {
                    if (i > 0) missingPhotoLabels += ", "
                    missingPhotoLabels += containerPhotoLabel(missing[i].value)
                }
                PreForecastPhotoProgressCache[p.id] = PhotoProgressCacheEntry(
                    uploadedRequired = uploadedRequired,
                    updatedAtMs = System.currentTimeMillis(),
                )
                LazyColumn(Modifier.padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    item {
                        Text(p.referenceNo, style = MaterialTheme.typography.headlineSmall)
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 6.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            StatusChip(p.status)
                            PhotoProgressChip(
                                uploaded = uploadedRequired,
                                total = photosTotal,
                            )
                        }
                    }
                    item { DetailRow(stringResource(R.string.field_container), p.containerNo) }
                    item { DetailRow(stringResource(R.string.field_size_type), "${p.containerSize} / ${p.containerType}") }
                    item { DetailRow(stringResource(R.string.field_shipping_line), p.shippingLineName) }
                    item { DetailRow(stringResource(R.string.field_created), p.createdAt) }
                    p.remarks?.let { item { DetailRow(stringResource(R.string.field_remarks), it) } }
                    if (canSubmit) {
                        item {
                            val submitLabel = if (isForCompliance) {
                                stringResource(R.string.preforecast_resubmit_for_evaluation)
                            } else {
                                stringResource(R.string.preforecast_submit_for_evaluation)
                            }
                            Button(
                                onClick = {
                                    scope.launch {
                                        actionLoading = true
                                        runCatching { repository.submitPreAdvice(id) }.onSuccess { load() }
                                        actionLoading = false
                                    }
                                },
                                enabled = !actionLoading && photosComplete,
                                modifier = Modifier.fillMaxWidth(),
                            ) { Text(submitLabel) }
                        }
                        item {
                            if (!photosComplete) {
                                Text(
                                    stringResource(
                                        R.string.preforecast_missing_required_photos,
                                        uploadedRequired,
                                        photosTotal,
                                        missingPhotoLabels,
                                    ),
                                    color = IcsColors.Warning,
                                    style = MaterialTheme.typography.bodySmall,
                                )
                            } else {
                                Text(
                                    stringResource(
                                        R.string.preforecast_all_required_photos_uploaded,
                                        uploadedRequired,
                                        photosTotal,
                                    ),
                                    color = IcsColors.Success,
                                    style = MaterialTheme.typography.bodySmall,
                                )
                            }
                        }
                    }
                    if (canManagePhotos) {
                        item {
                            Text(stringResource(R.string.preforecast_container_photos_title), style = MaterialTheme.typography.titleMedium)
                            Text(
                                stringResource(R.string.preforecast_container_photos_manage_hint),
                                style = MaterialTheme.typography.bodySmall,
                                color = IcsColors.TextSecondary,
                            )
                        }
                        items(CONTAINER_PHOTO_GRID_CATEGORIES.chunked(2)) { row ->
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                row.forEach { category ->
                                    val doc = docsByCategory[category.value]
                                    ContainerPhotoCard(
                                        category = category,
                                        document = doc,
                                        damageDocument = damageByView[category.value],
                                        canManage = canManagePhotos,
                                        loading = actionLoading,
                                        accessToken = accessToken,
                                        onUpload = {
                                            uploadCategory = category
                                            photoPicker.launch("image/*")
                                        },
                                        onDamage = {
                                            damageTarget = category
                                            damageDescription = parseDamageDescription(damageByView[category.value]?.comment)
                                            damageImageUri = null
                                        },
                                        onView = { preview = doc },
                                        onDelete = { deleteConfirm = doc },
                                        modifier = Modifier.weight(1f),
                                    )
                                }
                                if (row.size == 1) Spacer(Modifier.weight(1f))
                            }
                        }
                    } else {
                        item {
                            Text(stringResource(R.string.preforecast_container_photos_title), style = MaterialTheme.typography.titleMedium)
                        }
                        items(CONTAINER_PHOTO_GRID_CATEGORIES.chunked(2)) { row ->
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                row.forEach { category ->
                                    val doc = docsByCategory[category.value]
                                    ContainerPhotoCard(
                                        category = category,
                                        document = doc,
                                        damageDocument = damageByView[category.value],
                                        canManage = false,
                                        loading = false,
                                        accessToken = accessToken,
                                        onUpload = {},
                                        onDamage = {},
                                        onView = { preview = doc },
                                        onDelete = {},
                                        modifier = Modifier.weight(1f),
                                    )
                                }
                                if (row.size == 1) Spacer(Modifier.weight(1f))
                            }
                        }
                    }

                    val damageDocs = CONTAINER_PHOTO_GRID_CATEGORIES
                        .mapNotNull { c -> damageByView[c.value]?.let { c to it } }
                    if (damageDocs.isNotEmpty()) {
                        item {
                            Spacer(Modifier.height(8.dp))
                            Text(
                                stringResource(R.string.preforecast_damage_photos_title),
                                style = MaterialTheme.typography.titleMedium,
                                color = IcsColors.Error,
                            )
                            Text(
                                stringResource(R.string.preforecast_damage_photos_hint),
                                style = MaterialTheme.typography.bodySmall,
                                color = IcsColors.TextSecondary,
                            )
                        }
                        items(damageDocs.chunked(2)) { row ->
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                row.forEach { (category, doc) ->
                                    DamagePhotoCard(
                                        category = category,
                                        document = doc,
                                        canManage = canManagePhotos,
                                        loading = actionLoading,
                                        accessToken = accessToken,
                                        onUpdate = {
                                            damageTarget = category
                                            damageDescription = parseDamageDescription(doc.comment)
                                            damageImageUri = null
                                        },
                                        onView = { preview = doc },
                                        onDelete = { deleteConfirm = doc },
                                        modifier = Modifier.weight(1f),
                                    )
                                }
                                if (row.size == 1) Spacer(Modifier.weight(1f))
                            }
                        }
                    }
                }
            }
        }
    }

    if (deleteConfirm != null) {
        AlertDialog(
            onDismissRequest = { deleteConfirm = null },
            title = { Text(stringResource(R.string.dialog_remove_photo_title)) },
            text = {
                Text(stringResource(R.string.dialog_remove_photo_message))
            },
            confirmButton = {
                TextButton(
                    enabled = !actionLoading,
                    onClick = {
                        val doc = deleteConfirm ?: return@TextButton
                        scope.launch {
                            actionLoading = true
                            runCatching { repository.deletePreAdviceDocument(id, doc.id) }
                                .onSuccess {
                                    docs = repository.getPreAdviceDocuments(id)
                                    deleteConfirm = null
                                }
                                .onFailure { error = it.message }
                            actionLoading = false
                        }
                    },
                ) { Text(stringResource(R.string.action_remove)) }
            },
            dismissButton = {
                TextButton(onClick = { deleteConfirm = null }) { Text(stringResource(R.string.action_cancel)) }
            },
        )
    }

    if (preview != null) {
        val doc = preview!!
        Dialog(
            onDismissRequest = { preview = null },
            properties = DialogProperties(usePlatformDefaultWidth = false),
        ) {
            ZoomableImageViewer(
                title = doc.categoryLabel ?: containerPhotoLabel(doc.category),
                imageRequest = remember(doc.filePath, accessToken) {
                    buildAuthedImageRequest(context, doc.filePath, accessToken)
                },
                contentDescription = doc.fileName,
                onClose = { preview = null },
            )
        }
    }

    if (damageTarget != null) {
        AlertDialog(
            onDismissRequest = { damageTarget = null },
            title = {
                Text(
                    stringResource(
                        R.string.preforecast_damage_photo_title,
                        damageTarget?.let { containerPhotoLabel(it.value) } ?: "",
                    ),
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        modifier = Modifier.fillMaxWidth(),
                        onClick = { damagePhotoPicker.launch("image/*") },
                    ) {
                        Text(
                            if (damageImageUri != null) {
                                stringResource(R.string.preforecast_change_image)
                            } else {
                                stringResource(R.string.preforecast_choose_image)
                            },
                        )
                    }
                    TextField(
                        value = damageDescription,
                        onValueChange = { damageDescription = it },
                        label = { Text(stringResource(R.string.preforecast_damage_description)) },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 2,
                    )
                    Text(
                        stringResource(R.string.preforecast_damage_description_hint),
                        style = MaterialTheme.typography.bodySmall,
                        color = IcsColors.TextSecondary,
                    )
                }
            },
            confirmButton = {
                TextButton(
                    enabled = !actionLoading && damageTarget != null && damageImageUri != null && damageDescription.isNotBlank(),
                    onClick = {
                        val target = damageTarget ?: return@TextButton
                        val uri = damageImageUri ?: return@TextButton
                        scope.launch {
                            actionLoading = true
                            runCatching {
                                repository.uploadPreAdviceDocument(
                                    id,
                                    uri,
                                    DAMAGE_PHOTO_CATEGORY,
                                    formatDamageComment(target.value, damageDescription.trim()),
                                )
                            }
                                .onSuccess {
                                    docs = repository.getPreAdviceDocuments(id)
                                    damageTarget = null
                                    damageImageUri = null
                                    damageDescription = ""
                                    Toast.makeText(context, "Damage photo uploaded", Toast.LENGTH_SHORT).show()
                                }
                                .onFailure {
                                    error = it.message
                                    Toast.makeText(context, it.message ?: "Failed to upload damage photo", Toast.LENGTH_LONG).show()
                                }
                            actionLoading = false
                        }
                    },
                ) { Text(stringResource(R.string.action_upload)) }
            },
            dismissButton = {
                TextButton(onClick = { damageTarget = null }) { Text(stringResource(R.string.action_cancel)) }
            },
        )
    }
}

@Composable
private fun ZoomableImageViewer(
    title: String,
    imageRequest: ImageRequest,
    contentDescription: String,
    onClose: () -> Unit,
) {
    var scale by remember { mutableFloatStateOf(1f) }
    var offsetX by remember { mutableFloatStateOf(0f) }
    var offsetY by remember { mutableFloatStateOf(0f) }
    val transformableState = rememberTransformableState { zoomChange, panChange, _ ->
        scale = (scale * zoomChange).coerceIn(1f, 5f)
        if (scale > 1f) {
            offsetX += panChange.x
            offsetY += panChange.y
        } else {
            offsetX = 0f
            offsetY = 0f
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black),
    ) {
        AsyncImage(
            model = imageRequest,
            contentDescription = contentDescription,
            modifier = Modifier
                .fillMaxSize()
                .graphicsLayer(
                    scaleX = scale,
                    scaleY = scale,
                    translationX = offsetX,
                    translationY = offsetY,
                )
                .transformable(transformableState),
            contentScale = ContentScale.Fit,
        )

        Row(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 8.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = title,
                color = Color.White,
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.weight(1f),
                maxLines = 1,
            )
            IconButton(onClick = onClose) {
                Icon(Icons.Default.Close, contentDescription = stringResource(R.string.action_close), tint = Color.White)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PreForecastNewScreen(
    repository: TruckerRepository,
    onCreated: (Int) -> Unit,
    onBack: () -> Unit,
) {
    val loadState = rememberScreenLoadState(initiallyLoading = true)
    var lookups by remember { mutableStateOf<PreAdviceLookupsDto?>(null) }
    var containerNo by remember { mutableStateOf("") }
    var shippingLineId by remember { mutableIntStateOf(0) }
    var sizeId by remember { mutableIntStateOf(0) }
    var typeId by remember { mutableIntStateOf(0) }
    var remarks by remember { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }
    val refreshMessage = stringResource(R.string.refresh_feedback_preforecast_form)

    fun loadLookups() {
        scope.launch {
            loadState.begin(lookups != null)
            runCatching { lookups = repository.getPreAdviceLookups() }
                .onFailure { error = it.message }
            loadState.end()
        }
    }

    fun refreshLookups() {
        loadLookups()
        scope.launch { snackbarHostState.showSnackbar(refreshMessage) }
    }
    LaunchedEffect(Unit) { loadLookups() }

    IcsScreenScaffold(
        title = stringResource(R.string.preforecast_new_title),
        onBack = onBack,
        refreshing = loadState.refreshing,
        onRefresh = { refreshLookups() },
        showRefreshFeedback = false,
        snackbarHost = { _ -> SnackbarHost(hostState = snackbarHostState) },
    ) { padding ->
        if (loadState.loading) {
            LoadingBox(Modifier.padding(padding))
        } else {
            Column(
                Modifier
                    .padding(padding)
                    .padding(16.dp)
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedTextField(
                    containerNo,
                    { containerNo = it.uppercase() },
                    label = { Text(stringResource(R.string.field_container_number)) },
                    modifier = Modifier.fillMaxWidth(),
                )
                lookups?.let { l ->
                    DropdownField(stringResource(R.string.field_shipping_line), l.shippingLines.map { it.id to it.name }, shippingLineId) { shippingLineId = it }
                    DropdownField(stringResource(R.string.field_size), l.containerSizes.map { it.id to it.label }, sizeId) { sizeId = it }
                    DropdownField(stringResource(R.string.field_type), l.containerTypes.map { it.id to it.label }, typeId) { typeId = it }
                }
                OutlinedTextField(
                    remarks,
                    { remarks = it },
                    label = { Text(stringResource(R.string.field_remarks)) },
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(6.dp))
                IcsSectionCard(title = stringResource(R.string.preforecast_workflow_title)) {
                    IcsInfoTile(
                        label = "1",
                        value = stringResource(R.string.preforecast_workflow_step_1),
                    )
                    IcsInfoTile(
                        label = "2",
                        value = stringResource(R.string.preforecast_workflow_step_2),
                    )
                    IcsInfoTile(
                        label = "3",
                        value = stringResource(R.string.preforecast_workflow_step_3),
                    )
                }
                error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                Button(
                    onClick = {
                        saving = true
                        scope.launch {
                            runCatching {
                                repository.createPreAdvice(
                                    CreatePreAdviceRequest(shippingLineId, containerNo.trim(), sizeId, typeId, remarks.ifBlank { null }),
                                )
                            }.onSuccess { created -> onCreated(created.id) }
                                .onFailure { error = it.message; saving = false }
                        }
                    },
                    enabled = !saving && containerNo.isNotBlank() && shippingLineId > 0 && sizeId > 0 && typeId > 0,
                    modifier = Modifier.fillMaxWidth(),
                ) { Text(stringResource(R.string.action_create_draft)) }
            }
        }
    }
}

@Composable
private fun DetailRow(label: String, value: String) {
    Column {
        Text(label, style = MaterialTheme.typography.labelMedium)
        Text(value, style = MaterialTheme.typography.bodyLarge)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DropdownField(
    label: String,
    options: List<Pair<Int, String>>,
    selected: Int,
    onSelect: (Int) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val selectedLabel = options.find { it.first == selected }?.second
        ?: stringResource(R.string.field_select_label, label)
    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
        OutlinedTextField(
            value = selectedLabel,
            onValueChange = {},
            readOnly = true,
            label = { Text(label) },
            modifier = Modifier.menuAnchor(androidx.compose.material3.MenuAnchorType.PrimaryNotEditable, true).fillMaxWidth(),
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEach { (id, name) ->
                DropdownMenuItem(
                    text = { Text(name) },
                    onClick = { onSelect(id); expanded = false },
                )
            }
        }
    }
}

private data class ContainerPhotoCategory(val value: String, val required: Boolean)

private val CONTAINER_PHOTO_GRID_CATEGORIES = listOf(
    ContainerPhotoCategory("Flooring", true),
    ContainerPhotoCategory("RightSideIn", true),
    ContainerPhotoCategory("LeftSideIn", true),
    ContainerPhotoCategory("Back", true),
    ContainerPhotoCategory("Front", true),
    ContainerPhotoCategory("LeftSideOut", true),
    ContainerPhotoCategory("RightSideOut", true),
    ContainerPhotoCategory("Others", false),
)
private const val DAMAGE_PHOTO_CATEGORY = "Damage"
private val REQUIRED_PHOTO_CATEGORY_VALUES = CONTAINER_PHOTO_GRID_CATEGORIES
    .filter { it.required }
    .map { it.value }
private data class PhotoProgressCacheEntry(
    val uploadedRequired: Int,
    val updatedAtMs: Long,
)

private data class PreForecastListCacheEntry(
    val items: List<PreAdviceDto>,
    val updatedAtMs: Long,
)

private const val PHOTO_PROGRESS_CACHE_TTL_MS = 60_000L
private const val PREFORECAST_LIST_CACHE_TTL_MS = 60_000L
private val PreForecastPhotoProgressCache = mutableMapOf<Int, PhotoProgressCacheEntry>()
private var PreForecastListCache: PreForecastListCacheEntry? = null

@Composable
private fun PreForecastListRowCard(
    title: String,
    subtitle: String,
    status: String,
    uploaded: Int?,
    total: Int,
    onClick: () -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = IcsColors.Surface),
        border = androidx.compose.foundation.BorderStroke(1.dp, IcsColors.Divider),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(title, style = MaterialTheme.typography.titleSmall)
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = IcsColors.TextSecondary)
                if (uploaded != null) {
                    PhotoProgressChip(uploaded = uploaded, total = total)
                } else {
                    Text(stringResource(R.string.preforecast_checking_photos), style = MaterialTheme.typography.labelSmall, color = IcsColors.TextSecondary)
                }
            }
            Spacer(Modifier.width(8.dp))
            StatusChip(status)
        }
    }
}

@Composable
private fun ContainerPhotoCard(
    category: ContainerPhotoCategory,
    document: PreAdviceDocumentDto?,
    damageDocument: PreAdviceDocumentDto?,
    canManage: Boolean,
    loading: Boolean,
    accessToken: String?,
    onUpload: () -> Unit,
    onDamage: () -> Unit,
    onView: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(enabled = canManage && !loading, onClick = onUpload),
        colors = CardDefaults.cardColors(containerColor = IcsColors.Surface),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (document != null) IcsColors.Primary.copy(alpha = 0.25f) else IcsColors.Divider,
        ),
    ) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(containerPhotoLabel(category.value), style = MaterialTheme.typography.titleSmall)
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    if (damageDocument != null) {
                        Surface(
                            color = IcsColors.Error.copy(alpha = 0.12f),
                            shape = MaterialTheme.shapes.small,
                        ) {
                            Text(
                                stringResource(R.string.preforecast_damage_badge),
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                style = MaterialTheme.typography.labelSmall,
                                color = IcsColors.Error,
                            )
                        }
                    }
                    if (!category.required) {
                        Text(stringResource(R.string.label_optional), style = MaterialTheme.typography.labelSmall, color = IcsColors.TextSecondary)
                    }
                }
            }
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(150.dp)
                    .background(Color(0xFFF8FAFC)),
                contentAlignment = Alignment.Center,
            ) {
                if (document != null) {
                    AsyncImage(
                        model = remember(document.filePath, accessToken) {
                            buildAuthedImageRequest(context, document.filePath, accessToken)
                        },
                        contentDescription = containerPhotoLabel(category.value),
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop,
                    )
                } else {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.PhotoCamera, contentDescription = null, tint = IcsColors.TextSecondary)
                        Text(
                            if (canManage) stringResource(R.string.preforecast_tap_to_upload) else stringResource(R.string.preforecast_no_photo),
                            style = MaterialTheme.typography.bodySmall,
                            color = IcsColors.TextSecondary,
                        )
                    }
                }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                if (document != null) {
                    if (canManage) {
                        IconButton(enabled = !loading, onClick = onDamage) {
                            Icon(Icons.Default.ReportProblem, contentDescription = stringResource(R.string.content_desc_damage))
                        }
                    }
                    IconButton(onClick = onView) {
                        Icon(Icons.Default.ZoomIn, contentDescription = stringResource(R.string.content_desc_view))
                    }
                    if (canManage) {
                        IconButton(enabled = !loading, onClick = onDelete) {
                            Icon(Icons.Default.DeleteOutline, contentDescription = stringResource(R.string.content_desc_remove))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DamagePhotoCard(
    category: ContainerPhotoCategory,
    document: PreAdviceDocumentDto,
    canManage: Boolean,
    loading: Boolean,
    accessToken: String?,
    onUpdate: () -> Unit,
    onView: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = IcsColors.Surface),
        border = androidx.compose.foundation.BorderStroke(1.dp, IcsColors.Error.copy(alpha = 0.4f)),
    ) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(containerPhotoLabel(category.value), style = MaterialTheme.typography.titleSmall, color = IcsColors.Error)
                Surface(color = IcsColors.Error.copy(alpha = 0.12f), shape = MaterialTheme.shapes.small) {
                    Text(
                        stringResource(R.string.preforecast_damage_badge),
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                        style = MaterialTheme.typography.labelSmall,
                        color = IcsColors.Error,
                    )
                }
            }
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(150.dp)
                    .background(Color(0xFFF8FAFC)),
                contentAlignment = Alignment.Center,
            ) {
                AsyncImage(
                    model = remember(document.filePath, accessToken) {
                        buildAuthedImageRequest(context, document.filePath, accessToken)
                    },
                    contentDescription = containerPhotoLabel(category.value),
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop,
                )
            }
            Text(
                parseDamageDescription(document.comment).ifBlank { stringResource(R.string.preforecast_no_description) },
                style = MaterialTheme.typography.bodySmall,
                color = IcsColors.TextSecondary,
            )
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                if (canManage) {
                    IconButton(enabled = !loading, onClick = onUpdate) {
                        Icon(Icons.Default.ReportProblem, contentDescription = stringResource(R.string.content_desc_update_damage))
                    }
                }
                IconButton(onClick = onView) {
                    Icon(Icons.Default.ZoomIn, contentDescription = stringResource(R.string.content_desc_view))
                }
                if (canManage) {
                    IconButton(enabled = !loading, onClick = onDelete) {
                        Icon(Icons.Default.DeleteOutline, contentDescription = stringResource(R.string.content_desc_remove))
                    }
                }
            }
        }
    }
}

@Composable
private fun containerPhotoLabel(category: String?): String = when (category) {
    "Flooring" -> stringResource(R.string.container_photo_flooring)
    "RightSideIn" -> stringResource(R.string.container_photo_right_side_in)
    "LeftSideIn" -> stringResource(R.string.container_photo_left_side_in)
    "Back" -> stringResource(R.string.container_photo_back)
    "Front" -> stringResource(R.string.container_photo_front)
    "LeftSideOut" -> stringResource(R.string.container_photo_left_side_out)
    "RightSideOut" -> stringResource(R.string.container_photo_right_side_out)
    "Others" -> stringResource(R.string.container_photo_others)
    else -> category ?: stringResource(R.string.container_photo_generic)
}

private fun toAssetUrl(path: String): String {
    val normalizedPath = path.replace("\\", "/")
    if (normalizedPath.startsWith("http://") || normalizedPath.startsWith("https://")) return normalizedPath
    val base = BuildConfig.API_BASE_URL
        .trimEnd('/')
        .replace(Regex("/api$"), "")
    val normalized = if (normalizedPath.startsWith("/")) normalizedPath else "/$normalizedPath"
    return "$base$normalized"
}

private fun buildAuthedImageRequest(
    context: android.content.Context,
    filePath: String,
    accessToken: String?,
): ImageRequest {
    val url = toAssetUrl(filePath)
    return ImageRequest.Builder(context)
        .data(url)
        .apply {
            if (!accessToken.isNullOrBlank()) {
                addHeader("Authorization", "Bearer $accessToken")
            }
        }
        .crossfade(true)
        .build()
}

@Composable
private fun NewPreForecastPhotoCard(
    category: ContainerPhotoCategory,
    imageUri: Uri?,
    loading: Boolean,
    onSelect: () -> Unit,
    onRemove: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(enabled = !loading, onClick = onSelect),
        colors = CardDefaults.cardColors(containerColor = IcsColors.Surface),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (imageUri != null) IcsColors.Primary.copy(alpha = 0.25f) else IcsColors.Divider,
        ),
    ) {
        Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(containerPhotoLabel(category.value), style = MaterialTheme.typography.labelMedium)
                if (!category.required) {
                    Text(stringResource(R.string.label_optional), style = MaterialTheme.typography.labelSmall, color = IcsColors.TextSecondary)
                }
            }
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(120.dp)
                    .background(Color(0xFFF8FAFC)),
                contentAlignment = Alignment.Center,
            ) {
                if (imageUri != null) {
                    AsyncImage(
                        model = imageUri,
                        contentDescription = containerPhotoLabel(category.value),
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop,
                    )
                } else {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.PhotoCamera, contentDescription = null, tint = IcsColors.TextSecondary)
                        Text(stringResource(R.string.preforecast_tap_to_add), style = MaterialTheme.typography.labelSmall, color = IcsColors.TextSecondary)
                    }
                }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                if (imageUri != null) {
                    IconButton(enabled = !loading, onClick = onRemove) {
                        Icon(Icons.Default.DeleteOutline, contentDescription = stringResource(R.string.content_desc_remove))
                    }
                }
            }
        }
    }
}

private fun formatDamageComment(view: String, description: String): String {
    return "[$view] ${description.trim()}"
}

private fun parseDamageView(comment: String?): String? {
    if (comment.isNullOrBlank()) return null
    val match = Regex("^\\[([A-Za-z]+)]").find(comment)
    return match?.groupValues?.getOrNull(1)
}

private fun parseDamageDescription(comment: String?): String {
    if (comment.isNullOrBlank()) return ""
    return comment.replace(Regex("^\\[[A-Za-z]+]\\s*"), "").trim()
}

@Composable
private fun PhotoProgressChip(uploaded: Int, total: Int) {
    val done = uploaded >= total
    val bg = if (done) IcsColors.Success.copy(alpha = 0.14f) else IcsColors.Primary.copy(alpha = 0.12f)
    val fg = if (done) IcsColors.Success else IcsColors.Primary
    Surface(color = bg, shape = MaterialTheme.shapes.small) {
        Text(
            text = "$uploaded/$total photos",
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelMedium,
            color = fg,
        )
    }
}
