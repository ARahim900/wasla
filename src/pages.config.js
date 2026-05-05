import { lazy } from "react";
import Layout from "./Layout.jsx";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Clients = lazy(() => import("./pages/Clients"));
const Inspections = lazy(() => import("./pages/Inspections"));
const Invoices = lazy(() => import("./pages/Invoices"));
const Settings = lazy(() => import("./pages/Settings"));
const InspectionForm = lazy(() => import("./pages/InspectionForm"));
const InvoiceForm = lazy(() => import("./pages/InvoiceForm"));
const Properties = lazy(() => import("./pages/Properties"));
const InspectionReport = lazy(() => import("./pages/InspectionReport"));
const Login = lazy(() => import("./pages/Login"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

export const PAGES = {
    Dashboard, Clients, Inspections, Invoices, Settings,
    InspectionForm, InvoiceForm, Properties, InspectionReport,
    Login, ResetPassword,
};

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout,
};
