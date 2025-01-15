function createProfile({ name, about, picture, website, lud16, display_name }) {
  const profile = {
    name: name || "",
    about: about || "",
    picture: picture || "",
    website: website || "",
    lud16: lud16 || "",
    display_name: display_name || "",
    created_at: Math.floor(Date.now() / 1000),
  };

  // Delete keys with empty values
  Object.keys(profile).forEach((key) => {
    if (
      profile[key] === "" ||
      profile[key] === null ||
      profile[key] === undefined
    ) {
      delete profile[key];
    }
  });

  return JSON.stringify(profile);
}

export default createProfile;
