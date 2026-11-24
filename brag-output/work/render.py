import subprocess
narr = float(open("narr-len.txt").read())
total = narr + 1.5
xf = 0.45                      # dip-to-black transition length
scene = (total + 3 * xf) / 4
scenes = ["s1-hero", "s2-bestsellers", "s3-product", "s4-shop"]
parts = []
for i in range(4):
    frames = int(round(scene * 30))
    parts.append(f"[{i}:v]scale=2016:1134,zoompan=z='min(zoom+0.0006,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s=1920x1080:fps=30,setsar=1,format=yuv420p,trim=duration={scene:.3f},setpts=PTS-STARTPTS[v{i}]")
prev, offset = "v0", scene - xf
for i in range(1, 4):
    parts.append(f"[{prev}][v{i}]xfade=transition=fadeblack:duration={xf}:offset={offset:.3f}[x{i}]")
    prev = f"x{i}"
    offset += scene - xf
cmd = ["ffmpeg", "-y", "-loglevel", "error"]
for s in scenes:
    cmd += ["-loop", "1", "-t", f"{scene:.3f}", "-i", f"{s}.png"]
cmd += ["-i", "narration.wav",
        "-filter_complex", ";".join(parts),
        "-map", f"[{prev}]", "-map", "4:a",
        "-af", f"adelay=500|500,apad=whole_dur={total:.3f}",
        "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", "-t", f"{total:.3f}", "brag-raw.mp4"]
subprocess.run(cmd, check=True)
print("rendered", round(total, 2), "s")
