package com.ecms.trucker.data

data class TruckerFaqItem(
    val id: String,
    val questionEn: String,
    val questionTl: String,
    val answerEn: String,
    val answerTl: String,
)

data class TruckerFaqCategory(
    val id: String,
    val titleEn: String,
    val titleTl: String,
    val items: List<TruckerFaqItem>,
)

object TruckerFaqData {
    val categories: List<TruckerFaqCategory> = listOf(
        TruckerFaqCategory(
            id = "getting-started",
            titleEn = "Getting started",
            titleTl = "Pagsisimula",
            items = listOf(
                faq("register", "How do I register as a trucker?", "Paano mag-register bilang trucker?",
                    "Go to Create trucker account on the sign up screen. Fill in your company name, username, email, and password, then submit. You can sign in immediately after registration.",
                    "Pumunta sa Create trucker account sa sign up screen. Ilagay ang company name, username, email, at password, tapos i-submit. Puwede ka nang mag-login pagkatapos mag-register."),
                faq("login", "How do I sign in?", "Paano mag-sign in?",
                    "Use your username and password on the Sign in page. If you forgot your password, tap Forgot password and follow the reset link sent to your email.",
                    "Gamitin ang username at password sa Sign in page. Kung nakalimutan ang password, i-tap ang Forgot password at sundan ang reset link sa email."),
                faq("who-can-register", "Who can create a trucker account?", "Sino ang puwedeng gumawa ng trucker account?",
                    "Trucker accounts are self-service. Evaluator, depot, and admin accounts are created by your organization — contact your shipping line or ICS administrator.",
                    "Self-service ang trucker registration. Ang evaluator, depot, at admin accounts ay ginagawa ng inyong organization — kontakin ang shipping line o ICS admin."),
            ),
        ),
        TruckerFaqCategory(
            id = "pre-forecast",
            titleEn = "Pre-forecast",
            titleTl = "Pre-forecast",
            items = listOf(
                faq("what-is-preforecast", "What is a pre-forecast?", "Ano ang pre-forecast?",
                    "A pre-forecast is your advance notice to return an empty container to a Container Yard (CY) or Port Terminal. You submit container details and required photos before the shipping line evaluates your request.",
                    "Ang pre-forecast ay advance notice para ibalik ang empty container sa CY o Port Terminal. Isusubmit mo ang container details at required photos bago i-review ng shipping line."),
                faq("submit-preforecast", "How do I submit a pre-forecast?", "Paano mag-submit ng pre-forecast?",
                    "Open Pre-forecast → New pre-forecast. Scan or attach your CRO/eDO, then upload container identity photos on the detail screen. Submit when all required fields are complete.",
                    "Buksan ang Pre-forecast → New pre-forecast. I-scan o i-attach ang CRO/eDO, tapos i-upload ang container photos sa detail screen. I-submit kapag kumpleto na."),
                faq("preforecast-status", "What happens after I submit?", "Ano ang mangyayari pagkatapos mag-submit?",
                    "The shipping line evaluator reviews your pre-forecast. You will see status updates in the app (e.g. pending evaluation, approved, or returned for correction).",
                    "Irereview ng shipping line evaluator ang pre-forecast mo. Makikita mo ang status sa app (hal. pending, approved, o kailangan i-correct)."),
                faq("demurrage-gate", "Why can't I submit a new pre-forecast?", "Bakit hindi ako makapag-submit ng bagong pre-forecast?",
                    "You must settle outstanding demurrage billings first. Open Demurrage, review payment-due items, upload proof, and wait for verification before creating a new pre-forecast.",
                    "Kailangan munang bayaran ang outstanding demurrage billings. Buksan ang Demurrage, tingnan ang payment-due, mag-upload ng proof, at hintayin ang verification bago gumawa ng bagong pre-forecast."),
            ),
        ),
        TruckerFaqCategory(
            id = "returns",
            titleEn = "Returns & scheduling",
            titleTl = "Returns at scheduling",
            items = listOf(
                faq("my-returns", "Where do I see my assigned returns?", "Saan makikita ang assigned returns?",
                    "Open Returns after your pre-forecast is approved and a depot slot is assigned. You will see return date, time slot, depot, and any depot remarks.",
                    "Buksan ang Returns pag na-approve na ang pre-forecast at may assigned slot na. Makikita ang return date, time slot, depot, at depot remarks."),
                faq("return-schedule", "How do I confirm my return schedule?", "Paano i-confirm ang return schedule?",
                    "When a depot assigns you a slot, it appears under Returns. Open the return detail to view schedule information and follow any payment steps required before gate entry.",
                    "Kapag may slot na mula sa depot, lalabas ito sa Returns. Buksan ang return detail para makita ang schedule at sundin ang payment steps bago pumasok sa gate."),
                faq("notifications", "How do I get depot updates?", "Paano makatanggap ng depot updates?",
                    "Depot broadcasts appear in Notifications. Unread broadcasts may also pop up when you sign in. Enable push notifications for real-time alerts.",
                    "Ang depot broadcasts ay nasa Notifications. Maaaring mag-pop up din ang unread broadcasts pag nag-login ka. I-enable ang push notifications para sa real-time alerts."),
            ),
        ),
        TruckerFaqCategory(
            id = "payments",
            titleEn = "Payments",
            titleTl = "Payments",
            items = listOf(
                faq("preforecast-payment", "How do I pay pre-forecast fees?", "Paano magbayad ng pre-forecast fees?",
                    "Go to Payments, select the pending item, and upload your payment proof. Reference and date may be auto-filled from your screenshot. Wait for depot verification.",
                    "Pumunta sa Payments, piliin ang pending item, at i-upload ang payment proof. Maaaring auto-fill ang reference at date mula sa screenshot. Hintayin ang verification."),
                faq("payment-proof", "What payment proof is accepted?", "Anong payment proof ang tinatanggap?",
                    "Upload a clear image of your bank transfer, GCash, or other proof showing amount, reference, and date. Blurry or incomplete proofs may be rejected.",
                    "Mag-upload ng malinaw na image ng bank transfer, GCash, o iba pang proof na may amount, reference, at date. Maaaring ma-reject ang malabo o kulang na proof."),
                faq("qr-after-payment", "When can I get my booking QR?", "Kailan makukuha ang booking QR?",
                    "After your payment is verified, open QR passes to view your booking code and download the confirmation PDF. You can also send the booking to LOGICTECK.",
                    "Pag na-verify na ang payment, buksan ang QR passes para makita ang booking code at i-download ang confirmation PDF. Puwede mo ring i-send sa LOGICTECK."),
            ),
        ),
        TruckerFaqCategory(
            id = "demurrage-soa",
            titleEn = "Demurrage & SOA",
            titleTl = "Demurrage at SOA",
            items = listOf(
                faq("demurrage-billing", "What is demurrage billing?", "Ano ang demurrage billing?",
                    "Demurrage billing is a charge when a container exceeds free time. Open Demurrage to see outstanding amounts, upload payment proof, and track verification status.",
                    "Ang demurrage billing ay charge kapag lumampas sa free time ang container. Buksan ang Demurrage para makita ang amount, mag-upload ng proof, at i-track ang status."),
                faq("soa", "What is a Statement of Account (SOA)?", "Ano ang Statement of Account (SOA)?",
                    "An SOA groups multiple demurrage charges into one statement from your shipping line. Upload proof under Statement of accounts when payment is due.",
                    "Ang SOA ay pinagsama-samang demurrage charges mula sa shipping line. Mag-upload ng proof sa Statement of accounts kapag may babayaran."),
            ),
        ),
        TruckerFaqCategory(
            id = "withdrawals",
            titleEn = "Withdrawals & pickup",
            titleTl = "Withdrawals at pickup",
            items = listOf(
                faq("withdrawals", "How do withdrawals work?", "Paano gumagana ang withdrawals?",
                    "When a shipping line issues an Authority to Withdraw (ATW) for you, it appears under Withdrawals. Upload your ATW certificate, submit to CY, and track status through gate release.",
                    "Kapag may Authority to Withdraw (ATW) mula sa shipping line, lalabas ito sa Withdrawals. I-upload ang ATW certificate, i-submit sa CY, at i-track ang status hanggang gate release."),
                faq("book-pickup", "How do I book a withdrawal pickup?", "Paano mag-book ng withdrawal pickup?",
                    "Open the withdrawal detail or Pickup schedule to view assigned slots. Complete any required documents before your scheduled pickup.",
                    "Buksan ang withdrawal detail o Pickup schedule para makita ang assigned slots. Kumpletuhin ang required documents bago ang scheduled pickup."),
            ),
        ),
        TruckerFaqCategory(
            id = "mobile",
            titleEn = "Mobile app",
            titleTl = "Mobile app",
            items = listOf(
                faq("android-app", "Is there a mobile app for truckers?", "May mobile app ba para sa truckers?",
                    "Yes — the ICS Trucker Android app supports pre-forecast, returns, payments, demurrage, SOA, withdrawals, QR passes, and push notifications.",
                    "Oo — may ICS Trucker Android app para sa pre-forecast, returns, payments, demurrage, SOA, withdrawals, QR passes, at push notifications."),
                faq("support", "Who do I contact for help?", "Sino ang kontakin para sa tulong?",
                    "For account or access issues, contact your shipping line evaluator or ICS administrator. For depot schedule or gate questions, check Notifications or call the assigned depot.",
                    "Para sa account o access issues, kontakin ang shipping line evaluator o ICS admin. Para sa schedule o gate, tingnan ang Notifications o tawagan ang assigned depot."),
            ),
        ),
    )

    private fun faq(id: String, qEn: String, qTl: String, aEn: String, aTl: String) = TruckerFaqItem(id, qEn, qTl, aEn, aTl)
}
