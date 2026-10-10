import DemurrageBillingPage from '../evaluations/DemurrageBillingPage'

/** ICS admin DET-DEM list — separate from trucker and shipping-line evaluator menus. */
export default function AdminDetDemPage() {
  return <DemurrageBillingPage audience="admin" />
}
