export const API_BASE_URL = import.meta.env.DEV
    ? `http://${window.location.hostname}/el-share-api`
    : 'https://politeshining.helioho.st/el-share-api';