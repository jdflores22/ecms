namespace ECMS.Application.Logicteck;

public static class LogicteckCallbackStatus
{
    public const string Booked = "Booked";
    public const string WithTrucker = "With trucker";
    public const string NearYard = "Near yard";
    public const string AtYard = "At yard";
    public const string Retrieved = "Retrieved";
    public const string OnHold = "On hold";
    public const string Cancelled = "Cancelled";

    public const string LocationWithTrucker = "with_trucker";
    public const string LocationNearYard = "near_yard";
    public const string LocationAtYard = "at_yard";

    public static bool TryNormalize(string? raw, out string status, out string? location, out string? error)
    {
        status = string.Empty;
        location = null;
        error = null;

        var key = (raw ?? string.Empty).Trim().ToLowerInvariant().Replace('-', '_').Replace(' ', '_');
        if (string.IsNullOrWhiteSpace(key))
        {
            error = "status is required.";
            return false;
        }

        switch (key)
        {
            case "booked":
            case "booking":
            case "booking_created":
                status = Booked;
                return true;
            case "with_trucker":
            case "in_transit":
            case "enroute":
            case "en_route":
                status = WithTrucker;
                location = LocationWithTrucker;
                return true;
            case "near_yard":
            case "approaching":
            case "arriving":
                status = NearYard;
                location = LocationNearYard;
                return true;
            case "at_yard":
            case "yard_in":
            case "gate_in":
            case "gated_in":
                status = AtYard;
                location = LocationAtYard;
                return true;
            case "retrieved":
            case "collected":
                status = Retrieved;
                return true;
            case "on_hold":
            case "hold":
                status = OnHold;
                return true;
            case "cancelled":
            case "canceled":
                status = Cancelled;
                return true;
            default:
                if (key.Length > 40)
                {
                    error = "status must be 40 characters or fewer.";
                    return false;
                }

                status = key.Replace('_', ' ');
                return true;
        }
    }

    public static string? NormalizeLocation(string? raw, string? implied)
    {
        var key = (raw ?? string.Empty).Trim().ToLowerInvariant().Replace('-', '_').Replace(' ', '_');
        return key switch
        {
            LocationWithTrucker or "in_transit" or "enroute" or "en_route" => LocationWithTrucker,
            LocationNearYard or "approaching" or "arriving" => LocationNearYard,
            LocationAtYard or "yard_in" or "gate_in" or "gated_in" => LocationAtYard,
            "" => implied,
            _ => implied,
        };
    }

    public static bool MarksAtYard(string status) => status == AtYard;

    public static bool MarksRetrieved(string status) => status == AtYard || status == Retrieved;

    public static bool MarksBooked(string status) => status == Booked;
}
