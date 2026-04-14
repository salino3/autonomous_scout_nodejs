const BLACKLIST = [
  "glassdoor",
  "clutch.co",
  "techbehemoths",
  "goodfirms",
  "themanifest",
  "wellfound",
  "f6s.com",
  "linkedin",
  "facebook",
  "instagram",
  "youtube",
  "yelp",
  "yellowpages",
  "pdf",
  "crunchbase",
  "jobtome",
  "jooble",
  "jobeka",
  "indeed",
  "englishjobs",
];

export const isRealCompanySite = (url: string): boolean => {
  // Returns false if the URL contains any blacklisted keyword
  const isBlacklisted = BLACKLIST.some((domain) =>
    url.toLowerCase().includes(domain),
  );
  return !isBlacklisted;
};
