import { input as inputs } from "@pulumi/aws/types/";
import { Input } from "@pulumi/pulumi";

/**
 * Basically copied since IWebAclRule is not exported by pulumi
 *
 */
export interface IWebAclRule {
  /**
   * The action that AWS WAF should take on a web request when it matches the rule's statement. This is used only for rules whose **statements do not reference a rule group**. See Action below for details.
   */
  action?: Input<inputs.wafv2.WebAclRuleAction>;
  /**
   * A friendly name of the rule.
   */
  name: Input<string>;
  /**
   * The override action to apply to the rules in a rule group. Used only for rule **statements that reference a rule group**, like `ruleGroupReferenceStatement` and `managedRuleGroupStatement`. See Override Action below for details.
   */
  overrideAction?: Input<inputs.wafv2.WebAclRuleOverrideAction>;
  /**
   * If you define more than one Rule in a WebACL, AWS WAF evaluates each request against the `rules` in order based on the value of `priority`. AWS WAF processes rules with lower priority first.
   */
  priority: Input<number>;
  /**
   * The AWS WAF processing statement for the rule, for example `byteMatchStatement` or `geoMatchStatement`. See Statement below for details.
   */
  statement: Input<inputs.wafv2.WebAclRuleStatement>;
  /**
   * Defines and enables Amazon CloudWatch metrics and web request sample collection. See Visibility Configuration below for details.
   */
  visibilityConfig: Input<inputs.wafv2.WebAclRuleVisibilityConfig>;
}
