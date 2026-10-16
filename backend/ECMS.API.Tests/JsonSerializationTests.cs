using System.Text.Json;
using System.Text.Json.Serialization;
using ECMS.Application.DTOs.Schedule;
using ECMS.Domain.Enums;

namespace ECMS.API.Tests;

public class JsonSerializationTests
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        Converters = { new JsonStringEnumConverter() },
    };

    [Fact]
    public void UpdateScheduleRequest_serializes_time_as_string()
    {
        var json = JsonSerializer.Serialize(
            new UpdateScheduleRequest(
                DateOnly.Parse("2026-10-16"),
                new TimeOnly(8, 0),
                0,
                ScheduleStatus.Scheduled,
                null,
                null),
            JsonOptions);

        Assert.Contains("\"time\":\"08:00:00\"", json, StringComparison.Ordinal);
    }
}
