import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Inspections from './pages/Inspections';
import Invoices from './pages/Invoices';
import Settings from './pages/Settings';
import InspectionForm from './pages/InspectionForm';
import InvoiceForm from './pages/InvoiceForm';
import Properties from './pages/Properties';
import InspectionReport from './pages/InspectionReport';
import Login from './pages/Login';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Clients": Clients,
    "Inspections": Inspections,
    "Invoices": Invoices,
    "Settings": Settings,
    "InspectionForm": InspectionForm,
    "InvoiceForm": InvoiceForm,
    "Properties": Properties,
    "InspectionReport": InspectionReport,
    "Login": Login,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};