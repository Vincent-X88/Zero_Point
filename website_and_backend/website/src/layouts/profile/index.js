import React from "react";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import MDBox from "components/MDBox";
import AppBlocker from "./AppBlocker";

function Overview() {
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox mb={2} />
      {/* Render the AppBlocker functionality */}
      <AppBlocker />
      <Footer />
    </DashboardLayout>
  );
}

export default Overview;
