import Mathlib

/-!
# The last step (§1.4.5)

The paper concludes that the logarithmic derivative of `L` extends holomorphically across
the region right of the critical line, and reads off that `L` has no zeros there. This is
the complex-analysis fact behind that reading.
-/

open Filter Topology

namespace RH

/-- If `f` is analytic at `z` and not identically zero near `z`, and its logarithmic derivative
agrees near `z` with a function `g` analytic at `z`, then `f z ≠ 0`. Not yet proved. -/
theorem ne_zero_of_logDeriv_analyticAt {f g : ℂ → ℂ} {z : ℂ}
    (hf : AnalyticAt ℂ f z) (hg : AnalyticAt ℂ g z)
    (hne : ¬ ∀ᶠ w in 𝓝 z, f w = 0)
    (h : ∀ᶠ w in 𝓝[≠] z, deriv f w = g w * f w) : f z ≠ 0 := by
  sorry

end RH
