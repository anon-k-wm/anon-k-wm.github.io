Drop clips here and they appear on the page automatically (no HTML edits).
Until a file exists, its slot shows a placeholder (planning) or the paper still (rollout).

planning/{env}_{model}_{kind}_{planner}.{mp4|png}
  env:     pusht | maze | cube | reacher
  model:   dinowm | dinoft | lewm
  planner: cem | gd
  kind:    start, goal = stills (png) of the episode's first frame and goal frame;
           k1 = next-step baseline, k8 = k-WM = clips (mp4) of the executed plan.
  All four of a row come from the same episode. Square, 448x448.
  Made by sequence_wm/analysis/website_videos/make_clips.py.

rollout/pusht_dinoft.mp4
rollout/cube_dinoft.mp4
  Decoded rollouts (GT / next-step / k-WM); wide aspect, roughly 2.2:1.

Encode as H.264 + yuv420p, no audio, and strip metadata (ffmpeg -map_metadata -1).
