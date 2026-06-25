// Copy this file to config.js and fill in real values after app registration.
window.HTCC_CONFIG = {
  authMode: "fallback", // fallback | graph
  clientId: "4c8fba96-2410-4c09-964b-182483a0b551",
  tenantId: "consumers", // use "consumers" for personal Microsoft accounts; use tenant ID for work/school
  redirectUri: "https://dogara78-byte.github.io/hoosier-ticket-command-center/",
  managerEmail: "dogara78@msn.com",
  workbook: {
    driveId: "7878E2EF86F2636F",
    itemId: "7878E2EF86F2636F!s51c8f85d803c44508c4f3203a3072c5f",
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
