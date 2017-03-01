from __future__ import division
import json
import sys
import os
import math
import re

def read_data(infile):
    print 'reading', infile
    with open(infile) as s:
        data = json.loads(s.read())
    return data

def YorN(x):
    if x:
        return 'y'
    else:
        return 'n'

def fp(x,decimals):
    n = 10**decimals
    fmt = "0%d"%decimals
    sign = '-' if x<0 else ''
    x = abs(x)
    if x < n:
        return "%%s0.%%%sd"%fmt%(sign,x)
    else:
        return "%%s%%d.%%%sd"%fmt%(sign,x//n,x%n)

def fp1(x):
    fp(x,1)

def fp2(x):
    fp(x,2)

def fp3(x):
    fp(x,3)

# game_clock system_clock game_time ship_alive? ship_x ship_y ship_vel_x ship_vel_y ship_orientation mine_alive? mine_x mine_y fortress_alive? fortress_orientation [missile_x missile_y missile_orientation ...] [shell_x shell_y shell_orientation ...] bonus_symbol pnts cntrl vlcty vlner iff intervl speed shots thrust_key left_key right_key fire_key iff_key shots_key pnts_key

# 179859 1446576832.099348 641300 y 353.128 235.135 1.003 -0.833 272.0 n - - y 90.0 [352.823 254.290 272.0 ] [] - 1742 1062 1085 0 - 0 0 inf n n n y n n n

# [0,1,245,314,0,-100,0,1,180,[],[],0,0]
# [179777,1,402,394,-72,127,238,1,50,[],[[381,358,236]],1314,3]

def gen_press_data(data_length, event_data):
    if len(event_data) == 0:
        ret = [[0,0]] * data_length
    else:
        fire = 0
        thrust = 0
        ret = []
        last = 0
        for i in range(len(event_data)):
            line = event_data[i]
            acc = [[thrust, fire]] * (line[0] - last)
            ret += acc
            last = line[0]
            for e in line[1:]:
                if e[1] == 0:
                    fire = e[0]
                elif e[1] == 1:
                    pass # left
                elif e[1] == 2:
                    pass # right
                elif e[1] == 3:
                    thrust = e[0]
                else:
                    raise Exception('unknown keycode %s'%e)
        if data_length > line[0]:
            ret += [[thrust, fire]] * (data_length - line[0])

    print len(ret), data_length
    assert len(ret) == data_length

    return ret

def fmt_projectile (lst):
    ret = '';
    for p in lst:
        ret += '%s %s %s '%(fp(p[0],3), fp(p[1],3), fp(p[2],1))
    return ret

def write_header(out):
    out.write("# log version 1.5\n")
    out.write("# !!! generated from mturk space fortress game data !!!\n")
    out.write("# non-hashed line notation:\n")
    out.write("# game_clock system_clock game_time ship_alive? ship_x ship_y ship_vel_x ship_vel_y ship_orientation mine_alive? mine_x mine_y fortress_alive? fortress_orientation [missile_x missile_y missile_orientation ...] [shell_x shell_y shell_orientation ...] bonus_symbol pnts cntrl vlcty vlner iff intervl speed shots thrust_key left_key right_key fire_key iff_key shots_key pnts_key\n")

def write_footer(out, event_data):
    (pnts, rawpnts, bonus) = calculate_scores(event_data)
    out.write("# pnts score %d\n"%pnts)
    out.write("# total score %d\n"%pnts)
    out.write("# raw pnts %d\n"%rawpnts)
    out.write("# bonus earned $%.2f\n"%(bonus/100))

def process_game_data(game_data, key_data, event_data, outfile):
    key_state = gen_press_data(len(game_data), key_data)
    with open(outfile, 'w') as out:
        write_header(out)
        idx = 0
        last_time = game_data[0][0]
        for i in range(len(game_data)):
            d = game_data[i]
            ks = key_state[i]
            out.write("%d 0.000000 %d %s %s %s %s %s %s.0 n - - %s %s.0 [%s] [%s] - %d 0 0 %d - 0 0 inf %s n n %s n n n\n"%
                      (d[0], d[0]-last_time,
                       #ship
                       YorN(d[1]), fp(d[2],3), fp(d[3],3), fp(d[4],3), fp(d[5],3), d[6],
                       # fortress
                       YorN(d[7]), d[8],
                       # missiles, shells
                       fmt_projectile(d[9]), fmt_projectile(d[10]),
                       # points
                       d[11], d[12],
                       # keys
                       YorN(ks[0]), YorN(ks[1])))
            last_time = d[0]
        write_footer(out, event_data)

def key_event_name (ev):
    if ev[1] == 0:
        key = 'fire'
    elif ev[1] == 1:
        key = 'left'
    elif ev[1] == 2:
        key = 'right'
    elif ev[1] == 3:
        key = 'thrust'
    else:
        raise Exception("unknown code %s"%ev)
    if ev[0]:
        t = 'hold'
    else:
        t = 'release'
    return "%s-%s"%(t,key)

def convert_key_event (ev):
    if ev[1] == 0:
        key = 32
    elif ev[1] == 1:
        key = 97
    elif ev[1] == 2:
        key = 100
    elif ev[1] == 3:
        key = 119
    else:
        raise Exception("unknown code %s"%ev)
    if ev[0]:
        t = 2
    else:
        t = 3
    return [t, key, 0]

def process_key_events(game_data, key_data, outfile):
    with open(outfile, 'w') as out:
        last = game_data[0][0]
        rate = 0
        cur = 0
        for i in range(len(game_data)):
            rate = game_data[i][0] - last
            last = game_data[i][0]
            d = game_data[i]
            if cur < len(key_data) and key_data[cur][0] == i:
                keys = [ convert_key_event(k) for k in key_data[cur][1:] ]
                if not game_data[i-1][1]:
                    print 'boom', keys
                    # only record releases when the ship is dead
                    # because in original auto-turn, pressing space
                    # shoots a missile but in js version, no missile
                    # is fired.
                    tmp = []
                    for k in keys:
                        if k[0] == 3:
                            tmp.append(k)
                    keys = tmp
                    print 'and', keys
                frame = [rate, keys]
                cur += 1
            else:
                frame = [rate, []]
            out.write("%s\n"%json.dumps(frame))

def convert_game_events (ev):
    event_codes = ['explode-smallhex',
                   'explode-bighex',
                   'ship-respawn',
                   'fortress-fired',
                   'shell-hit-ship',
                   'missile-fired',
                   'hit-fortress',
                   'fortress-destroyed',
                   'fortress-respawn',
                   'vlner-reset',
                   'vlner-increased',

                   'press-left',
                   'press-right',
                   'press-thrust',
                   'press-fire',
                   'release-left',
                   'release-right',
                   'release-thrust',
                   'release-fire']
    return [ event_codes[e] for e in ev[1:] ]

def calculate_scores(event_data):
    pnts = 0
    rawpnts = 0
    for x in event_data:
        events = convert_game_events(x)
        if 'fortress-destroyed' in events:
            pnts += 100
            rawpnts += 100
        if 'shell-hit-ship' in events or 'explode-smallhex' in events or 'explode-bighex' in events:
            pnts = max(0, pnts-100)
            rawpnts -= 100
        if 'missile-fired' in events:
            pnts = max(0, pnts-2)
            rawpnts -= 2
    bonus = min(60, math.ceil(pnts/3000 * 60))
    return (pnts, rawpnts, bonus)

def process_game_events(game_data, event_data, key_data, outfile):
    with open(outfile, 'w') as out:
        key_cur = 0
        event_cur = 0
        for i in range(len(game_data)):
            d = game_data[i]
            if event_cur < len(event_data) and event_data[event_cur][0] == i:
                frame = convert_game_events(event_data[event_cur])
                event_cur += 1
            else:
                frame = []
            if key_cur < len(key_data) and key_data[key_cur][0] == i:
                for k in key_data[key_cur][1:]:
                    frame.insert(0, key_event_name(k))
                key_cur += 1
            out.write("%d 0.000000 %s\n"%(d[0], ','.join(frame)))

def worker_id(base):
    return base.split('.')[0]

def assignment_id(base):
    return base.split('.')[1]

def scan_for_workers(base):
    subjects = []
    for root, dirs, files in os.walk(base,topdown=False):
        (head,tail) = os.path.split(root)
        # print root, dirs, files
        good = True
        assign = 'UNKNOWN'
        for f in files:
            m = re.match(tail + '\.([A-Z0-9]+)\.\d+\.(?:log|events|keylog)$', f)
            if m:
                assign = m.group(1)
            else:
                # print tail, 'not a subject', f
                good = False
                break
        if good:
            print 'found subject', tail
            subjects.append([tail, assign])
    return subjects

if __name__ == '__main__':
    root = sys.argv[1]
    for pair in scan_for_workers(root):
        worker = pair[0]
        assign = pair[1]

        if not os.path.exists(worker):
            os.mkdir(worker)

        for n in range(20):
            base = "%s/%s.%s.%d"%(worker, worker,assign,n)
            print '%s/%s.log'%(root,base), os.path.normpath('%s/%s.log'%(root,base))
            if os.path.exists(os.path.normpath('%s/%s.log'%(root,base))):
                game_data = read_data(os.path.normpath('%s/%s.log'%(root,base)))
                event_data = read_data(os.path.normpath('%s/%s.events'%(root,base)))
                key_data = read_data(os.path.normpath('%s/%s.keylog'%(root,base)))

                process_game_data(game_data, key_data, event_data, "%s/%s-1-%s.dat"%(worker, worker, n+1))
                process_key_events(game_data, key_data, "%s/%s-1-%s.key"%(worker, worker, n+1))
                process_game_events(game_data, event_data, key_data, "%s/%s-1-%s.evt"%(worker, worker, n+1))
            else:
                print "Skip??"

    # game_data = read_data(sys.argv[1])
    # key_data = read_data(sys.argv[2])
    # process_game_data(game_data, key_data, sys.argv[3] + ".dat")
    # process_key_events(game_data, key_data, sys.argv[3] + ".key")
