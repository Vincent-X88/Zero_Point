import WhatsAppMessagesPage from "layouts/dashboard";
import ContactsTable from "layouts/tables";
import Sms from "layouts/billing";
import DeviceLocation from "layouts/rtl";
import Overview from "layouts/profile";
import SignIn from "layouts/authentication/sign-in";
import SignUp from "layouts/authentication/sign-up";
import LockDevice from "layouts/notifications";

// @mui icons
import Icon from "@mui/material/Icon";
import AppBlockingIcon from "@mui/icons-material/AppBlocking";

const routes = [
  {
    type: "collapse",
    name: "Whatsapp messages",
    key: "dashboard",
    icon: <Icon fontSize="small">dashboard</Icon>,
    route: "/dashboard",
    component: <WhatsAppMessagesPage />,
  },
  {
    type: "collapse",
    name: "Contacts",
    key: "tables",
    icon: <Icon fontSize="small">contacts</Icon>,
    route: "/contacts",
    component: <ContactsTable />,
  },
  {
    type: "collapse",
    name: "SMS",
    key: "sms",
    icon: <Icon fontSize="small">sms</Icon>,
    route: "/sms",
    component: <Sms />,
  },
  {
    type: "collapse",
    name: "Location",
    key: "location",
    icon: <Icon fontSize="small">my_location</Icon>,
    route: "/location",
    component: <DeviceLocation />,
  },
  {
    type: "collapse",
    name: "Lock Device",
    key: "lockdevice",
    icon: <Icon fontSize="small">lock</Icon>,
    route: "/lockdevice",
    component: <LockDevice />,
  },

  {
    type: "collapse",
    name: "Appclocker",
    key: "appclocker",
    icon: <AppBlockingIcon fontSize="small" />,
    route: "/appcontroller",
    component: <Overview />,
  },

  {
    type: "collapse",
    name: "Sign In",
    key: "sign-in",
    icon: <Icon fontSize="small">login</Icon>,
    route: "/authentication/sign-in",
    component: <SignIn />,
  },
  {
    type: "collapse",
    name: "Sign Up",
    key: "sign-up",
    icon: <Icon fontSize="small">person_add</Icon>,
    route: "/authentication/sign-up",
    component: <SignUp />,
  },
];

export default routes;
