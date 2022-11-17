/**
 * function to get all domain names and aliases
 *
 * @param includeWwwSubDomain - parameter to set whether the site has the "www." subdomain
 * @param targetDomain - fqdn of the website, e.g. blog.mydomain.com
 * @returns domains - an array of domains of type string
 */
export function getDomains(
  includeWwwSubDomain: boolean,
  targetDomain: string
): string[] {
  // include an alias for the www subdomain
  if (includeWwwSubDomain) {
    return [`www.${targetDomain}`, targetDomain];
  } else {
    return [targetDomain];
  }
}
