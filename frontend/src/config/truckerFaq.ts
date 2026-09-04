export type TruckerFaqCategory = {
  id: string
  title: string
  titleTl: string
  items: TruckerFaqItem[]
}

export type TruckerFaqItem = {
  id: string
  question: string
  questionTl: string
  answer: string
  answerTl: string
}

export const TRUCKER_FAQ_CATEGORIES: TruckerFaqCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    titleTl: 'Pagsisimula',
    items: [
      {
        id: 'register',
        question: 'How do I register as a trucker?',
        questionTl: 'Paano mag-register bilang trucker?',
        answer:
          'Go to Create trucker account on the home page or visit Sign up. Fill in your company name, username, email, and password, then submit. You can sign in immediately after registration.',
        answerTl:
          'Pumunta sa Create trucker account sa home page o Sign up. Ilagay ang company name, username, email, at password, tapos i-submit. Puwede ka nang mag-login pagkatapos mag-register.',
      },
      {
        id: 'login',
        question: 'How do I sign in?',
        questionTl: 'Paano mag-sign in?',
        answer:
          'Use your username and password on the Sign in page. If you forgot your password, click Forgot password and follow the reset link sent to your email.',
        answerTl:
          'Gamitin ang username at password sa Sign in page. Kung nakalimutan ang password, i-click ang Forgot password at sundan ang reset link sa email.',
      },
      {
        id: 'who-can-register',
        question: 'Who can create a trucker account?',
        questionTl: 'Sino ang puwedeng gumawa ng trucker account?',
        answer:
          'Trucker accounts are self-service. Evaluator, depot, and admin accounts are created by your organization — contact your shipping line or ICS administrator.',
        answerTl:
          'Self-service ang trucker registration. Ang evaluator, depot, at admin accounts ay ginagawa ng inyong organization — kontakin ang shipping line o ICS admin.',
      },
    ],
  },
  {
    id: 'pre-forecast',
    title: 'Pre-forecast',
    titleTl: 'Pre-forecast',
    items: [
      {
        id: 'what-is-preforecast',
        question: 'What is a pre-forecast?',
        questionTl: 'Ano ang pre-forecast?',
        answer:
          'A pre-forecast is your advance notice to return an empty container to a Container Yard (CY) or Port Terminal. You submit container details and required photos before the shipping line evaluates your request.',
        answerTl:
          'Ang pre-forecast ay advance notice para ibalik ang empty container sa CY o Port Terminal. Isusubmit mo ang container details at required photos bago i-review ng shipping line.',
      },
      {
        id: 'submit-preforecast',
        question: 'How do I submit a pre-forecast?',
        questionTl: 'Paano mag-submit ng pre-forecast?',
        answer:
          'After signing in, open Pre-forecast → New pre-forecast. Enter container number, shipping line, size/type, destination depot, and upload container identity photos. Submit when all required fields are complete.',
        answerTl:
          'Pagkatapos mag-login, buksan ang Pre-forecast → New pre-forecast. Ilagay ang container number, shipping line, size/type, depot, at i-upload ang container photos. I-submit kapag kumpleto na.',
      },
      {
        id: 'preforecast-status',
        question: 'What happens after I submit?',
        questionTl: 'Ano ang mangyayari pagkatapos mag-submit?',
        answer:
          'The shipping line evaluator reviews your pre-forecast. You will see status updates in the portal (e.g. pending evaluation, approved, or returned for correction). Check Pre-forecast list for details.',
        answerTl:
          'Irereview ng shipping line evaluator ang pre-forecast mo. Makikita mo ang status sa portal (hal. pending, approved, o kailangan i-correct). Tingnan ang Pre-forecast list para sa detalye.',
      },
      {
        id: 'demurrage-gate',
        question: 'Why can’t I submit a new pre-forecast?',
        questionTl: 'Bakit hindi ako makapag-submit ng bagong pre-forecast?',
        answer:
          'You must settle outstanding demurrage billings first. Open Demurrage billing, review any payment-due items, upload proof, and wait for evaluator verification before creating a new pre-forecast.',
        answerTl:
          'Kailangan munang bayaran ang outstanding demurrage billings. Buksan ang Demurrage billing, tingnan ang payment-due, mag-upload ng proof, at hintayin ang verification bago gumawa ng bagong pre-forecast.',
      },
    ],
  },
  {
    id: 'returns',
    title: 'Returns & scheduling',
    titleTl: 'Returns at scheduling',
    items: [
      {
        id: 'my-returns',
        question: 'Where do I see my assigned returns?',
        questionTl: 'Saan makikita ang assigned returns?',
        answer:
          'Open My returns after your pre-forecast is approved and a depot slot is assigned. You will see return date, time slot, depot, and any depot remarks.',
        answerTl:
          'Buksan ang My returns pag na-approve na ang pre-forecast at may assigned slot na. Makikita ang return date, time slot, depot, at depot remarks.',
      },
      {
        id: 'return-schedule',
        question: 'How do I confirm my return schedule?',
        questionTl: 'Paano i-confirm ang return schedule?',
        answer:
          'When a depot assigns you a slot, it appears under My returns. Open the return detail to view schedule information and follow any payment steps required before gate entry.',
        answerTl:
          'Kapag may slot na mula sa depot, lalabas ito sa My returns. Buksan ang return detail para makita ang schedule at sundin ang payment steps bago pumasok sa gate.',
      },
      {
        id: 'notifications',
        question: 'How do I get depot updates?',
        questionTl: 'Paano makatanggap ng depot updates?',
        answer:
          'Depot broadcasts (closures, delays, yard advisories) appear in Notifications. Unread broadcasts may also pop up when you sign in.',
        answerTl:
          'Ang depot broadcasts (closures, delays, advisories) ay nasa Notifications. Maaaring mag-pop up din ang unread broadcasts pag nag-login ka.',
      },
    ],
  },
  {
    id: 'payments',
    title: 'Payments',
    titleTl: 'Payments',
    items: [
      {
        id: 'preforecast-payment',
        question: 'How do I pay pre-forecast fees?',
        questionTl: 'Paano magbayad ng pre-forecast fees?',
        answer:
          'Go to Payments, select the pending item, and upload your payment proof (screenshot or receipt). Enter reference number and transaction date if available. Wait for admin or depot verification.',
        answerTl:
          'Pumunta sa Payments, piliin ang pending item, at i-upload ang payment proof. Ilagay ang reference number at transaction date kung meron. Hintayin ang verification.',
      },
      {
        id: 'payment-proof',
        question: 'What payment proof is accepted?',
        questionTl: 'Anong payment proof ang tinatanggap?',
        answer:
          'Upload a clear image of your bank transfer, GCash, or other proof showing amount, reference, and date. Blurry or incomplete proofs may be rejected and you will need to upload again.',
        answerTl:
          'Mag-upload ng malinaw na image ng bank transfer, GCash, o iba pang proof na may amount, reference, at date. Maaaring ma-reject ang malabo o kulang na proof.',
      },
      {
        id: 'qr-after-payment',
        question: 'When can I get my booking QR?',
        questionTl: 'Kailan makukuha ang booking QR?',
        answer:
          'After your pre-forecast payment is verified, open Booking QR to generate or view your LOGICTECK booking code. Print or show the QR at the gate as instructed by the depot.',
        answerTl:
          'Pag na-verify na ang pre-forecast payment, buksan ang Booking QR para makita ang LOGICTECK code. I-print o ipakita ang QR sa gate ayon sa instruction ng depot.',
      },
    ],
  },
  {
    id: 'demurrage-soa',
    title: 'Demurrage & SOA',
    titleTl: 'Demurrage at SOA',
    items: [
      {
        id: 'demurrage-billing',
        question: 'What is demurrage billing?',
        questionTl: 'Ano ang demurrage billing?',
        answer:
          'Demurrage billing is a charge when a container exceeds free time. Open Demurrage billing to see outstanding amounts, upload payment proof, and track verification status.',
        answerTl:
          'Ang demurrage billing ay charge kapag lumampas sa free time ang container. Buksan ang Demurrage billing para makita ang amount, mag-upload ng proof, at i-track ang status.',
      },
      {
        id: 'soa',
        question: 'What is a Statement of Account (SOA)?',
        questionTl: 'Ano ang Statement of Account (SOA)?',
        answer:
          'An SOA groups multiple demurrage charges into one statement from your shipping line. You will only see SOAs if your account is registered for SOA by the shipping line. Upload proof under Statement of accounts when payment is due.',
        answerTl:
          'Ang SOA ay pinagsama-samang demurrage charges mula sa shipping line. Makikita mo lang ito kung naka-register ang account mo para sa SOA. Mag-upload ng proof sa Statement of accounts kapag may babayaran.',
      },
    ],
  },
  {
    id: 'withdrawals',
    title: 'Withdrawals & pickup',
    titleTl: 'Withdrawals at pickup',
    items: [
      {
        id: 'withdrawals',
        question: 'How do withdrawals work?',
        questionTl: 'Paano gumagana ang withdrawals?',
        answer:
          'When a shipping line issues an Authority to Withdraw (ATW) for you, it appears under My withdrawals. You can book a pickup slot, upload documents if required, and track status through to gate release.',
        answerTl:
          'Kapag may Authority to Withdraw (ATW) mula sa shipping line, lalabas ito sa My withdrawals. Puwede kang mag-book ng pickup slot, mag-upload ng documents, at i-track ang status hanggang gate release.',
      },
      {
        id: 'book-pickup',
        question: 'How do I book a withdrawal pickup?',
        questionTl: 'Paano mag-book ng withdrawal pickup?',
        answer:
          'Open the withdrawal detail, choose an available depot and time slot, and confirm booking. Complete any required truck/driver details before your scheduled pickup.',
        answerTl:
          'Buksan ang withdrawal detail, pumili ng available depot at time slot, at i-confirm. Kumpletuhin ang truck/driver details bago ang scheduled pickup.',
      },
    ],
  },
  {
    id: 'mobile',
    title: 'Mobile app',
    titleTl: 'Mobile app',
    items: [
      {
        id: 'android-app',
        question: 'Is there a mobile app for truckers?',
        questionTl: 'May mobile app ba para sa truckers?',
        answer:
          'Yes — the ICS Trucker Android app supports pre-forecast, returns, payments, demurrage, SOA, withdrawals, and push notifications. Install the latest build from your administrator or internal distribution link.',
        answerTl:
          'Oo — may ICS Trucker Android app para sa pre-forecast, returns, payments, demurrage, SOA, withdrawals, at push notifications. I-install ang latest build mula sa admin o internal link.',
      },
      {
        id: 'support',
        question: 'Who do I contact for help?',
        questionTl: 'Sino ang kontakin para sa tulong?',
        answer:
          'For account or access issues, contact your shipping line evaluator or ICS administrator. For depot schedule or gate questions, check Notifications or call the assigned depot.',
        answerTl:
          'Para sa account o access issues, kontakin ang shipping line evaluator o ICS admin. Para sa schedule o gate, tingnan ang Notifications o tawagan ang assigned depot.',
      },
    ],
  },
]
