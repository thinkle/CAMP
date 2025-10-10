# Next steps

-> Pretty up interface...
-> Add interface for browsing generated schedules with some convenient methods (like top-10, or similarity matrix or something).
-> Add custom exploration techniques for exploring more territory with schedules
-> Add hashing so our save/load schedule is tied to a hash of the current settings.

## Minimum Size Support Improvements

-> **Improve heuristics to consider `minSize` when generating schedules**

- Current heuristics don't proactively ensure activities meet minimum size requirements
- This can lead to many invalid schedules being generated and then filtered out
- Options:
  - Add minSize-aware heuristics that try to fill activities to minimum before moving on
  - Modify existing heuristics to check activity counts and avoid creating under-minimum activities
  - Add a "fill to minimum" pass after initial assignment
- Would improve efficiency by generating fewer invalid schedules that need to be filtered
