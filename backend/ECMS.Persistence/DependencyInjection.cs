using System.Text.Json;
using ECMS.Application;
using ECMS.Application.Interfaces;
using ECMS.Domain.Entities;
using ECMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ECMS.Persistence;

public static class DependencyInjection
{
    public static IServiceCollection AddPersistence(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<EcmsDbContext>(options =>
            options.UseMySql(connectionString, new MySqlServerVersion(new Version(8, 0, 36))));

        services.AddScoped<IEcmsDbContext>(sp => sp.GetRequiredService<EcmsDbContext>());
        services.AddScoped<DbSeeder>();

        return services;
    }
}

public class DbSeeder
{
    private readonly EcmsDbContext _context;
    private readonly IPasswordHasher _passwordHasher;

    public DbSeeder(EcmsDbContext context, IPasswordHasher passwordHasher)
    {
        _context = context;
        _passwordHasher = passwordHasher;
    }

    public async Task SeedAsync()
    {
        await _context.Database.MigrateAsync();

        if (!await _context.RolesSet.AnyAsync())
        {
            var roles = RoleCatalogDefaults.All.Select(d => new Role
            {
                Name = d.Name,
                Label = d.Label,
                Description = d.Description,
                CapabilitiesJson = JsonSerializer.Serialize(d.Capabilities),
                AllowedPagesJson = JsonSerializer.Serialize(d.AllowedPages),
            }).ToArray();
            _context.RolesSet.AddRange(roles);
            await _context.SaveChangesAsync();
        }
        else
        {
            var changed = false;
            foreach (var role in await _context.RolesSet.ToListAsync())
            {
                var defaults = RoleCatalogDefaults.Get(role.Name);
                if (defaults is null) continue;

                if (string.IsNullOrWhiteSpace(role.Label))
                {
                    role.Label = defaults.Label;
                    changed = true;
                }

                if (string.IsNullOrWhiteSpace(role.Description))
                {
                    role.Description = defaults.Description;
                    changed = true;
                }

                if (RoleCapabilitiesJson.Deserialize(role.CapabilitiesJson).Count == 0)
                {
                    role.CapabilitiesJson = JsonSerializer.Serialize(defaults.Capabilities);
                    changed = true;
                }

                if (RoleAllowedPagesJson.Deserialize(role.AllowedPagesJson).Count == 0)
                {
                    role.AllowedPagesJson = JsonSerializer.Serialize(defaults.AllowedPages);
                    changed = true;
                }
            }

            if (changed)
                await _context.SaveChangesAsync();
        }

        await MigrateBrokerRoleToTruckerAsync();
        await SyncTruckerRoleFromCatalogAsync();
        await SyncAdministratorRoleFromCatalogAsync();
        await SyncDepotPersonnelRoleFromCatalogAsync();
        await SyncShippingLineEvaluatorRoleFromCatalogAsync();

        if (!await _context.PaymentSettingsSet.AnyAsync())
        {
            _context.PaymentSettingsSet.Add(new PaymentSettings
            {
                Id = 1,
                ReturnFeeAmount = 5000m,
                UpdatedAt = Domain.Common.PhilippinesTime.UtcNow,
            });
            await _context.SaveChangesAsync();
        }

        if (!await _context.ShippingLinesSet.AnyAsync())
        {
            _context.ShippingLinesSet.Add(new ShippingLine { Name = "MAERSK", Code = "MAERSK" });
            _context.ShippingLinesSet.Add(new ShippingLine { Name = "MSC", Code = "MSC" });
            await _context.SaveChangesAsync();
        }

        if (!await _context.DepotsSet.AnyAsync())
        {
            _context.DepotsSet.Add(new Depot
            {
                Name = "ICTSI CY",
                Address = "Manila, Philippines",
                Capacity = 100
            });
            await _context.SaveChangesAsync();
        }

        if (!await _context.ContainerSizesSet.AnyAsync())
        {
            _context.ContainerSizesSet.AddRange(
                new ContainerSize { Label = "20", Teu = 1m, SortOrder = 1 },
                new ContainerSize { Label = "40", Teu = 2m, SortOrder = 2 },
                new ContainerSize { Label = "45", Teu = 2m, SortOrder = 3 });
            await _context.SaveChangesAsync();
        }

        if (!await _context.ContainerTypesSet.AnyAsync())
        {
            _context.ContainerTypesSet.AddRange(
                new ContainerType { Code = "GP", Label = "General Purpose", SortOrder = 1 },
                new ContainerType { Code = "HC", Label = "High Cube", SortOrder = 2 },
                new ContainerType { Code = "RF", Label = "Reefer", SortOrder = 3 },
                new ContainerType { Code = "OT", Label = "Open Top", SortOrder = 4 });
            await _context.SaveChangesAsync();
        }

        if (!await _context.ShippingLineDepotContractsSet.AnyAsync())
        {
            var maersk = await _context.ShippingLinesSet.FirstAsync(x => x.Code == "MAERSK");
            var depot = await _context.DepotsSet.FirstAsync();
            var size40 = await _context.ContainerSizesSet.FirstAsync(s => s.Label.StartsWith("40"));

            var maerskContract = new ShippingLineDepotContract
            {
                ShippingLineId = maersk.Id,
                DepotId = depot.Id,
                ContractTeu = 200,
            };
            maerskContract.SizeAllocations.Add(new ShippingLineDepotContractSizeAllocation
            {
                ContainerSizeId = size40.Id,
                ContractCount = 100,
            });
            _context.ShippingLineDepotContractsSet.Add(maerskContract);

            var msc = await _context.ShippingLinesSet.FirstAsync(x => x.Code == "MSC");
            var mscContract = new ShippingLineDepotContract
            {
                ShippingLineId = msc.Id,
                DepotId = depot.Id,
                ContractTeu = 150,
            };
            mscContract.SizeAllocations.Add(new ShippingLineDepotContractSizeAllocation
            {
                ContainerSizeId = size40.Id,
                ContractCount = 75,
            });
            _context.ShippingLineDepotContractsSet.Add(mscContract);
            await _context.SaveChangesAsync();
        }

        if (!await _context.ContainersSet.AnyAsync())
        {
            var maersk = await _context.ShippingLinesSet.FirstAsync(x => x.Code == "MAERSK");
            _context.ContainersSet.Add(new Container
            {
                ContainerNo = "TGHU1234567",
                Size = "40",
                Type = "HC",
                ShippingLineId = maersk.Id
            });
            var msc = await _context.ShippingLinesSet.FirstAsync(x => x.Code == "MSC");
            _context.ContainersSet.Add(new Container
            {
                ContainerNo = "MSCU7654321",
                Size = "20",
                Type = "GP",
                ShippingLineId = msc.Id
            });
            await _context.SaveChangesAsync();
        }

        if (!await _context.UsersSet.AnyAsync())
        {
            var roles = await _context.RolesSet.ToDictionaryAsync(x => x.Name, x => x.Id);
            var maersk = await _context.ShippingLinesSet.FirstAsync(x => x.Code == "MAERSK");
            var depot = await _context.DepotsSet.FirstAsync();

            var users = new[]
            {
                new User { Username = "admin", Email = "admin@ecms.local", PasswordHash = _passwordHasher.Hash("Admin@123"), RoleId = roles[RoleNames.Administrator], FullName = "System Admin" },
                new User { Username = "evaluator1", Email = "evaluator@ecms.local", PasswordHash = _passwordHasher.Hash("Evaluator@123"), RoleId = roles[RoleNames.ShippingLineEvaluator], FullName = "Demo Evaluator", ShippingLineId = maersk.Id },
                new User { Username = "depot1", Email = "depot@ecms.local", PasswordHash = _passwordHasher.Hash("Depot@123"), RoleId = roles[RoleNames.DepotPersonnel], FullName = "Demo Depot", DepotId = depot.Id },
                new User { Username = "trucker1", Email = "trucker@ecms.local", PasswordHash = _passwordHasher.Hash("Trucker@123"), RoleId = roles[RoleNames.Trucker], FullName = "ABC Trucking" }
            };

            _context.UsersSet.AddRange(users);
            await _context.SaveChangesAsync();
        }
    }

    private async Task MigrateBrokerRoleToTruckerAsync()
    {
        var brokerRole = await _context.RolesSet.FirstOrDefaultAsync(r => r.Name == "Broker");
        if (brokerRole is null)
            return;

        var truckerRole = await _context.RolesSet.FirstOrDefaultAsync(r => r.Name == RoleNames.Trucker);
        if (truckerRole is null)
            return;

        var brokerUsers = await _context.UsersSet.Where(u => u.RoleId == brokerRole.Id).ToListAsync();
        foreach (var user in brokerUsers)
            user.RoleId = truckerRole.Id;

        _context.RolesSet.Remove(brokerRole);
        await _context.SaveChangesAsync();
    }

    private async Task SyncTruckerRoleFromCatalogAsync()
    {
        var truckerRole = await _context.RolesSet.FirstOrDefaultAsync(r => r.Name == RoleNames.Trucker);
        var defaults = RoleCatalogDefaults.Get(RoleNames.Trucker);
        if (truckerRole is null || defaults is null)
            return;

        truckerRole.Label = defaults.Label;
        truckerRole.Description = defaults.Description;
        truckerRole.CapabilitiesJson = JsonSerializer.Serialize(defaults.Capabilities);
        truckerRole.AllowedPagesJson = JsonSerializer.Serialize(defaults.AllowedPages);
        await _context.SaveChangesAsync();
    }

    private async Task SyncAdministratorRoleFromCatalogAsync()
    {
        var adminRole = await _context.RolesSet.FirstOrDefaultAsync(r => r.Name == RoleNames.Administrator);
        var defaults = RoleCatalogDefaults.Get(RoleNames.Administrator);
        if (adminRole is null || defaults is null)
            return;

        adminRole.Label = defaults.Label;
        adminRole.Description = defaults.Description;
        adminRole.CapabilitiesJson = JsonSerializer.Serialize(defaults.Capabilities);
        adminRole.AllowedPagesJson = JsonSerializer.Serialize(defaults.AllowedPages);
        await _context.SaveChangesAsync();
    }

    private async Task SyncDepotPersonnelRoleFromCatalogAsync()
    {
        var depotRole = await _context.RolesSet.FirstOrDefaultAsync(r => r.Name == RoleNames.DepotPersonnel);
        var defaults = RoleCatalogDefaults.Get(RoleNames.DepotPersonnel);
        if (depotRole is null || defaults is null)
            return;

        depotRole.Label = defaults.Label;
        depotRole.Description = defaults.Description;
        depotRole.CapabilitiesJson = JsonSerializer.Serialize(defaults.Capabilities);
        depotRole.AllowedPagesJson = JsonSerializer.Serialize(defaults.AllowedPages);
        await _context.SaveChangesAsync();
    }

    private async Task SyncShippingLineEvaluatorRoleFromCatalogAsync()
    {
        var evaluatorRole = await _context.RolesSet.FirstOrDefaultAsync(r => r.Name == RoleNames.ShippingLineEvaluator);
        var defaults = RoleCatalogDefaults.Get(RoleNames.ShippingLineEvaluator);
        if (evaluatorRole is null || defaults is null)
            return;

        evaluatorRole.Label = defaults.Label;
        evaluatorRole.Description = defaults.Description;
        evaluatorRole.CapabilitiesJson = JsonSerializer.Serialize(defaults.Capabilities);
        evaluatorRole.AllowedPagesJson = JsonSerializer.Serialize(defaults.AllowedPages);
        await _context.SaveChangesAsync();
    }
}
