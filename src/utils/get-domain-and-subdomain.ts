import { IDomainComponents } from "./../types/domain-components";
/**
 * splits a domain name into its subdomain and parent domain names.
 * e.g. "www.example.com" => "www", "example.com".
 * @param domain - fqdn of the website, e.g. www.blog.mydomain.com
 * @returns the domain components
 */
export function getDomainAndSubdomain(domain: string): IDomainComponents {
  const parts = domain.split(".");
  if (parts.length < 2) {
    throw new Error(`No top level domain found on ${domain}`);
  }
  // No subdomain, e.g. awesome-website.com.
  if (parts.length === 2) {
    return { subdomain: "", parentDomain: domain };
  }

  const subdomain = parts[0];
  parts.shift(); // Drop first element.
  return {
    subdomain,
    // Trailing "." to canonicalize domain.
    parentDomain: parts.join(".") + ".",
  };
}
