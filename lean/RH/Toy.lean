import Mathlib

/-!
# The toy example (§1.2.8)

On the circle `ℝ>0 / γ^ℤ` the pure tones `t ^ (2πim / log γ)` are eigenvectors of convolution
by a test function `φ`, with eigenvalues given by the Mellin transform of `φ`. Poisson
summation rewrites the trace as a sum of values of `φ` at the powers of `γ`. If `φ` is
supported strictly between `1` and `γ`, the trace is zero.
-/

open Real Set
open scoped ContDiff

namespace RH.Toy

/-- The trace of convolution by `φ` on the circle `ℝ>0 / γ^ℤ`, computed two ways.
This is Poisson summation after the substitution `t = exp u`. Not yet proved. -/
theorem trace_identity {γ : ℝ} (hγ : 1 < γ) {φ : ℝ → ℂ} (hφ : ContDiff ℝ ∞ φ)
    (hc : HasCompactSupport φ) (h0 : tsupport φ ⊆ Ioi 0) :
    ∑' m : ℤ, mellin φ (2 * π * Complex.I * m / Real.log γ)
      = Real.log γ * ∑' k : ℤ, φ (γ ^ k) := by
  sorry

/-- A test function living strictly between `1` and `γ` misses every power of `γ`,
so the trace vanishes. -/
theorem trace_eq_zero {γ : ℝ} (hγ : 1 < γ) {φ : ℝ → ℂ} (hφ : ContDiff ℝ ∞ φ)
    (hc : HasCompactSupport φ) (hs : tsupport φ ⊆ Ioo 1 γ) :
    ∑' m : ℤ, mellin φ (2 * π * Complex.I * m / Real.log γ) = 0 := by
  rw [trace_identity hγ hφ hc (hs.trans fun x hx => lt_trans one_pos hx.1)]
  have h : ∀ k : ℤ, φ (γ ^ k) = 0 := by
    intro k
    apply image_eq_zero_of_notMem_tsupport
    intro hk
    obtain ⟨h1, h2⟩ := hs hk
    rcases le_or_gt k 0 with hk0 | hk0
    · exact absurd h1 (not_lt.mpr (zpow_le_one_of_nonpos₀ hγ.le hk0))
    · have : γ ^ (1 : ℤ) ≤ γ ^ k := zpow_le_zpow_right₀ hγ.le (by omega)
      rw [zpow_one] at this
      exact absurd h2 (not_lt.mpr this)
  simp [h]

end RH.Toy
