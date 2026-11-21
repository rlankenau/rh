import Mathlib

/-!
# One slot per frequency (§1.2.8, the exact sequence of the toy example)

Averaging a function over the powers of `γ` kills `φ(t) - φ(γ t)`: the sum telescopes.
On the Mellin side that function is `(1 - γ^(-s)) · M(φ)(s)`, so its transform vanishes at
every frequency `2πim / log γ` of the circle `ℝ>0 / γ^ℤ`. Those frequencies are the "slots".
-/

open Real

namespace RH.Slots

/-- The Mellin transform of `φ(t) - φ(γ t)` vanishes at every frequency of the circle. -/
theorem mellin_sub_scaled_eq_zero {γ : ℝ} (hγ : 1 < γ) {φ : ℝ → ℂ} (m : ℤ)
    (hφ : MellinConvergent φ (2 * π * Complex.I * m / Real.log γ)) :
    mellin (fun t => φ t - φ (γ * t)) (2 * π * Complex.I * m / Real.log γ) = 0 := by
  set s : ℂ := 2 * π * Complex.I * m / Real.log γ with hs
  have hγ0 : 0 < γ := by linarith
  have h2 : MellinConvergent (fun t => φ (γ * t)) s :=
    (MellinConvergent.comp_mul_left hγ0).mpr hφ
  have hsplit : mellin (fun t => φ t - φ (γ * t)) s
      = mellin φ s - mellin (fun t => φ (γ * t)) s := by
    simp only [mellin, smul_sub]
    exact MeasureTheory.integral_sub hφ h2
  have hpow : (γ : ℂ) ^ (-s) = 1 := by
    have hl : (Real.log γ : ℂ) ≠ 0 := by exact_mod_cast (Real.log_pos hγ).ne'
    rw [Complex.cpow_def_of_ne_zero (by exact_mod_cast hγ0.ne'), ← Complex.ofReal_log hγ0.le]
    have : (Real.log γ : ℂ) * -s = ((-m : ℤ) : ℂ) * (2 * π * Complex.I) := by
      rw [hs]; push_cast; field_simp
    rw [this]
    exact Complex.exp_int_mul_two_pi_mul_I _
  rw [hsplit, mellin_comp_mul_left φ s hγ0, hpow, one_smul, sub_self]

end RH.Slots
