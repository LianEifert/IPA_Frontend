const appSettings = () => {

    const app_settings_vals = {
        "URL": process.env.REACT_APP_REALTIME_ENDPOINT,
    };
    return app_settings_vals;
};

export default appSettings;
