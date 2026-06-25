// Copy this file to config.js and fill in real values after app registration.
window.HTCC_CONFIG = {
  authMode: "fallback", // fallback | graph
  clientId: "YOUR_ENTRA_APP_CLIENT_ID",
  tenantId: "consumers", // use "consumers" for personal Microsoft accounts; use tenant ID for work/school
  redirectUri: "https://YOUR_GITHUB_USERNAME.github.io/hoosier-ticket-command-center/",
  managerEmail: "YOUR_PERSONAL_MICROSOFT_EMAIL_HERE",
  workbook: {
    driveId: "YOUR_DRIVE_ID",
    itemId: "YOUR_WORKBOOK_ITEM_ID",
    tables: {
      transactions: "TransactionsTable",
      games: "GamesTable",
      members: "MembersTable",
      seatAccounts: "SeatAccountsTable",
      parkingUsage: "ParkingUsageTable",
      seatUsage: "SeatUsageTable"
    }
  },
  scopes: ["Files.ReadWrite", "User.Read"]
};
