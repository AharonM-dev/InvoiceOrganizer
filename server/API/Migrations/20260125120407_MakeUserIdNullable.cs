using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API.Migrations
{
    /// <inheritdoc />
    public partial class MakeUserIdNullable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UploadedDocuments_Users_UserId",
                table: "UploadedDocuments");

            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "UploadedDocuments",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AddForeignKey(
                name: "FK_UploadedDocuments_Users_UserId",
                table: "UploadedDocuments",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UploadedDocuments_Users_UserId",
                table: "UploadedDocuments");

            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "UploadedDocuments",
                type: "TEXT",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_UploadedDocuments_Users_UserId",
                table: "UploadedDocuments",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
