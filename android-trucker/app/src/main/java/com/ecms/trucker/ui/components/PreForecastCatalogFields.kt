package com.ecms.trucker.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.ecms.trucker.R
import com.ecms.trucker.data.model.PreAdviceLookupsDto

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PreForecastCatalogFields(
    lookups: PreAdviceLookupsDto,
    containerNo: String,
    onContainerNoChange: (String) -> Unit,
    shippingLineId: Int,
    onShippingLineIdChange: (Int) -> Unit,
    sizeId: Int,
    onSizeIdChange: (Int) -> Unit,
    typeId: Int,
    onTypeIdChange: (Int) -> Unit,
    readOnly: Boolean = false,
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedTextField(
            containerNo,
            { if (!readOnly) onContainerNoChange(it.uppercase()) },
            label = { Text(stringResource(R.string.field_container_number)) },
            modifier = Modifier.fillMaxWidth(),
            readOnly = readOnly,
            enabled = !readOnly,
        )
        PreForecastLookupDropdown(
            label = stringResource(R.string.field_shipping_line),
            options = lookups.shippingLines.map { it.id to it.name },
            selected = shippingLineId,
            onSelect = onShippingLineIdChange,
            readOnly = readOnly,
        )
        PreForecastLookupDropdown(
            label = stringResource(R.string.field_size),
            options = lookups.containerSizes.map { it.id to it.label },
            selected = sizeId,
            onSelect = onSizeIdChange,
            readOnly = readOnly,
        )
        PreForecastLookupDropdown(
            label = stringResource(R.string.field_type),
            options = lookups.containerTypes.map { it.id to it.label },
            selected = typeId,
            onSelect = onTypeIdChange,
            readOnly = readOnly,
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PreForecastLookupDropdown(
    label: String,
    options: List<Pair<Int, String>>,
    selected: Int,
    onSelect: (Int) -> Unit,
    readOnly: Boolean,
) {
    var expanded by remember { mutableStateOf(false) }
    val selectedLabel = options.find { it.first == selected }?.second.orEmpty()
    ExposedDropdownMenuBox(
        expanded = expanded && !readOnly,
        onExpandedChange = { if (!readOnly) expanded = it },
    ) {
        OutlinedTextField(
            value = selectedLabel.ifBlank { label },
            onValueChange = {},
            readOnly = true,
            enabled = !readOnly,
            label = { Text(label) },
            trailingIcon = {
                if (!readOnly) {
                    ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded)
                }
            },
            modifier = Modifier
                .menuAnchor(androidx.compose.material3.MenuAnchorType.PrimaryNotEditable, true)
                .fillMaxWidth(),
        )
        if (!readOnly) {
            ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                options.forEach { (id, name) ->
                    DropdownMenuItem(
                        text = { Text(name) },
                        onClick = {
                            onSelect(id)
                            expanded = false
                        },
                    )
                }
            }
        }
    }
}
