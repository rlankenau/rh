import Mathlib

/-!
# Target statements

Masullo's claim is GRH for Hecke L-functions of every number field. Mathlib has no
Hecke L-functions for general number fields yet, so these are the statements for `ℚ`,
where Hecke characters of finite order are Dirichlet characters.
-/

namespace RH

/-- GRH for Dirichlet L-functions: every zero in the open critical strip has real part `1/2`. -/
def DirichletGRH : Prop :=
  ∀ (N : ℕ) [NeZero N] (χ : DirichletCharacter ℂ N) (s : ℂ),
    DirichletCharacter.LFunction χ s = 0 → 0 < s.re → s.re < 1 → s.re = 1 / 2

/-- What step 7 of the paper delivers before the functional equation is applied: no zeros to
the right of the critical line. This is the same statement as `UpperTheory.EveryCharacter`
in the Alpöge formalization. -/
def NoZerosRightOfHalf : Prop :=
  ∀ (N : ℕ) [NeZero N] (χ : DirichletCharacter ℂ N) (s : ℂ),
    1 / 2 < s.re → (χ ≠ 1 ∨ s ≠ 1) → DirichletCharacter.LFunction χ s ≠ 0

end RH
