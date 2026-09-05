using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations;

/// <summary>
/// Adds <see cref="ECMS.Domain.Enums.ContainerPhotoCategory.Backdoor"/> (value 10) for pre-forecast identity photos.
/// Uses the existing <c>PreAdviceDocumentsSet.Category</c> int column — no table alteration required.
/// </summary>
[DbContext(typeof(EcmsDbContext))]
[Migration("20260905140500_AddBackdoorContainerPhotoCategory")]
public partial class AddBackdoorContainerPhotoCategory : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
    }
}
