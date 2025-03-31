describe("Dashboard Page", () => {
  beforeEach(() => {
    // Log in before each test (using custom command)
    cy.login("test@example.com", "testpassword");

    // Visit the dashboard page
    cy.visit("/dashboard/dashboard");
  });

  it("displays dashboard elements", () => {
    // Check for main dashboard elements
    cy.contains("Welcome").should("be.visible");
    cy.contains("Command Center").should("be.visible");
    cy.contains("Recent Projects").should("be.visible");
  });

  it("executes a command", () => {
    // Type and submit a command
    cy.get('input[id="command"]').type("Create a simple landing page");
    cy.contains("button", "Run").click();

    // Check for loading state
    cy.contains("Processing...").should("be.visible");

    // Wait for response and check that result is displayed
    cy.contains("Result:").should("be.visible", { timeout: 10000 });
  });

  it("navigates to projects page", () => {
    // Click on the "View All" link next to Recent Projects
    cy.contains("View All").click();

    // Check that we're on the projects page
    cy.url().should("include", "/projects");
    cy.contains("Projects").should("be.visible");
  });
});

// Custom command for login is now in commands.ts
