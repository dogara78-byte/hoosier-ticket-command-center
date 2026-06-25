# Microsoft Graph / OneDrive integration plan

## Account type

The workbook is tied to a personal Microsoft account, so the SPA should use the Microsoft identity platform with a consumer/personal-account compatible setup. In `config.js`, start with `tenantId: "consumers"` unless the app registration uses a different supported authority.

## App registration

1. Go to Microsoft Entra admin center / app registrations.
2. Create a new app registration.
3. Supported account types: personal Microsoft accounts, or personal + organizational if you want flexibility.
4. Platform: Single-page application.
5. Redirect URI: your GitHub Pages app URL.
6. API permissions: `User.Read`, `Files.ReadWrite`.

## Workbook tables required

The Excel workbook should include these named tables:

- `TransactionsTable`
- `GamesTable`
- `MembersTable`
- `SeatAccountsTable`
- `SeatUsageTable`
- `ParkingUsageTable`

The app can read table ranges and eventually append rows to `TransactionsTable`.

## Writeback path

Manager entry should create a transaction row in the same column order as `TransactionsTable`, then call:

`POST /drives/{driveId}/items/{itemId}/workbook/tables/{tableName}/rows/add`

Do not write directly to arbitrary cells. Always append to structured tables.

## Security

Client-side manager checks are convenience checks, not true security. Real access control comes from Microsoft sign-in, file permissions, and limiting workbook write access to Dennis's Microsoft account.
