using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ECMS.Persistence;

/// <summary>
/// Idempotent column repairs for production when EF history and schema drift.
/// </summary>
public static class ProductionSchemaRepair
{
    public static async Task ApplyAsync(EcmsDbContext db, ILogger logger, CancellationToken cancellationToken = default)
    {
        await EnsureColumnAsync(
            db,
            logger,
            table: "PaymentsSet",
            column: "ProofProvider",
            definition: "varchar(32) CHARACTER SET utf8mb4 NULL",
            migrationId: "20260701120000_AddPaymentProofProvider",
            cancellationToken);

        await EnsureColumnAsync(
            db,
            logger,
            table: "PaymentsSet",
            column: "ProofQrphInvoiceNo",
            definition: "varchar(32) CHARACTER SET utf8mb4 NULL",
            migrationId: "20260701140000_AddPaymentProofQrphInvoiceNo",
            cancellationToken);

        await EnsureColumnAsync(
            db,
            logger,
            table: "SchedulesSet",
            column: "DepotRemarks",
            definition: "longtext CHARACTER SET utf8mb4 NULL",
            migrationId: "20260701160000_AddScheduleDepotRemarks",
            cancellationToken);
    }

    private static async Task EnsureColumnAsync(
        EcmsDbContext db,
        ILogger logger,
        string table,
        string column,
        string definition,
        string migrationId,
        CancellationToken cancellationToken)
    {
        var exists = await ColumnExistsAsync(db, table, column, cancellationToken);
        if (!exists)
        {
            logger.LogWarning("Adding missing column {Table}.{Column}", table, column);
            await db.Database.ExecuteSqlRawAsync(
                $"ALTER TABLE `{table}` ADD `{column}` {definition}",
                cancellationToken);
        }

        await db.Database.ExecuteSqlRawAsync(
            """
            INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
            VALUES ({0}, '7.0.20')
            """,
            migrationId);
    }

    private static async Task<bool> ColumnExistsAsync(
        EcmsDbContext db,
        string table,
        string column,
        CancellationToken cancellationToken)
    {
        var connection = db.Database.GetDbConnection();
        var shouldClose = connection.State != System.Data.ConnectionState.Open;
        if (shouldClose)
            await connection.OpenAsync(cancellationToken);

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = """
                SELECT COUNT(*)
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = @table
                  AND COLUMN_NAME = @column
                """;

            var tableParam = command.CreateParameter();
            tableParam.ParameterName = "@table";
            tableParam.Value = table;
            command.Parameters.Add(tableParam);

            var columnParam = command.CreateParameter();
            columnParam.ParameterName = "@column";
            columnParam.Value = column;
            command.Parameters.Add(columnParam);

            var result = await command.ExecuteScalarAsync(cancellationToken);
            return Convert.ToInt32(result) > 0;
        }
        finally
        {
            if (shouldClose)
                await connection.CloseAsync();
        }
    }
}
