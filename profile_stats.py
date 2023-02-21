import pstats
p = pstats.Stats('server_profile')
# skip strip_dirs() if you want to see full path's
p.strip_dirs().print_stats()