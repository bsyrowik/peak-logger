import { actions } from "astro:actions";
import { navigate } from "astro:transitions/client";

declare global {
    interface Window { logout: any; }
}

if (!window.logout) {
    window.logout = async function (): Promise<void> {
        const { data, error } = await actions.account.logout();
        if (!error && data) {
            navigate(data);
        }
    };
}
