import { AppConfig, OidcConfig } from "@/utils/config";
import axios, { AxiosError, AxiosInstance } from "axios";
import { User } from "oidc-client-ts";
import { notify } from "@/components/Shared/Snackbar/snackbarStore";
import router from "@/router";

export type OnErrorType = (error: AxiosError) => void;
export type OnSuccessType = (data: any) => void;

const submitClient = axios.create({ baseURL: AppConfig.apiUrl });
const documentClient = axios.create({ baseURL: AppConfig.documentUrl });
const conditionLibraryClient = axios.create({
  baseURL: AppConfig.conditionsLibraryUrl,
});
const axiosClient = axios.create();

function getUser() {
  const oidcStorage = sessionStorage.getItem(
    `oidc.user:${OidcConfig.authority}:${OidcConfig.client_id}`,
  );
  if (!oidcStorage) {
    return null;
  }

  return User.fromStorageString(oidcStorage);
}

const getAuthToken = () => {
  const user = getUser();
  if (user?.access_token) {
    return user.access_token;
  }
  throw new Error("No access token");
};

const setAuthToken = (client: AxiosInstance) => {
  const authToken = getAuthToken();

  client.defaults.headers.common.Authorization = `Bearer ${authToken}`;
};

// Helper function to centralize API error handling
const _handleApiError = (error: any, clientIdentifier: string) => {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      // Check for 404 first
      if (error.response.status === 404) {
        router.navigate({ to: '/not-found' });
        notify.error(`Error ${error.response.status}: The requested resource was not found.`);
      } else {
        // Handle other server errors (non-404)
        notify.error(
          (error.response?.data as { message: string })?.message ?? // Using existing ErrorResponseData implicitly
            error.message ??
            `API Error on ${clientIdentifier}!`
        );
      }
    } else {
      // Handle network errors (no response)
      notify.error(`Network error or CORS issue on ${clientIdentifier}`);
    }
  } else {
    // Handle non-Axios errors
    notify.error(`An unexpected error occurred on ${clientIdentifier}`);
  }

  throw error; // Always re-throw the error
};

export const submitRequest = async <T = any>({ ...options }) => {
  setAuthToken(submitClient);
  try {
    const response = await submitClient.request<T>(options);
    return response.data;
  } catch (error) {
    _handleApiError(error, "submitRequest");
  }
};

export const publicRequest = async <T = any>({ ...options }) => {
  try {
    const response = await submitClient.request<T>(options);
    return response.data;
  } catch (error) {
    _handleApiError(error, "publicRequest");
  }
};

export const conditionLibraryRequest = async <T = any>({ ...options }) => {
  setAuthToken(conditionLibraryClient);
  try {
    const response = await conditionLibraryClient.request<T>(options);
    return response.data;
  } catch (error) {
    _handleApiError(error, "conditionLibraryRequest");
  }
};

export const documentRequest = async <T = any>({ ...options }) => {
  setAuthToken(documentClient);
  try {
    const response = await documentClient.request<T>(options);
  return response.data;
  } catch (error) {
    _handleApiError(error, "documentRequest");
  }
};

type ErrorResponseData = {
  message: string;
};
export const requestAxios = async ({ ...options }) => {
  try {
    const response = await axiosClient(options); // Use the global instance
    return response?.data ?? response.data;
  } catch (error) {
    _handleApiError(error, "requestAxios");
  }
};
