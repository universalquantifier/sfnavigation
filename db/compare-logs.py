import re
import sys

class Object(object):
    def __init__(self):
        pass

class LogLine(object):
    def __init__(self, txt):
        self.parse_line(txt)

    def parse_projectiles(self, triplets):
        ret = []
        if len(triplets) > 0:
            nums = triplets.rstrip(' ').split(' ')
            #print(triplets, nums)
            for i in range(0,len(nums), 3):
                o = Object()
                o.position = [nums[i], nums[i+1]]
                o.orientation = float(nums[i+2])
                ret.append(o)
        return ret

    def parse_line(self, line):
        m = re.match("(\d+) (\d+\.\d+) (\d+) (y|n) (-|-?\d+\.\d+) (-|-?\d+\.\d+) (-|-?\d+\.\d+) (-|-?\d+\.\d+) (-|\d+\.\d+) (y|n) (\d+\.\d+|-) (\d+\.\d+|-) (y|n) (-|\d+(?:\.\d+)?) \[((?:-?\d+\.\d+ )*)\] \[((?:-?\d+\.\d+ )*)\] (-) (-?\d+) (-?\d+) (-?\d+) (-?\d+) ([A-Z-]) (\d+) (-?\d+) (inf|\d+) (y|n) (y|n) (y|n) (y|n) (y|n) (y|n) (y|n)", line)
        if m == None:
            raise Exception('failed to parse: %s'%line)
        self.timestamp = int(m.group(1))
        self.ship = Object()
        self.ship.alive = m.group(4) == 'y';
        self.ship.position = [m.group(5), m.group(6)]
        if self.ship.alive:
            self.ship.velocity = [m.group(7), m.group(8)]
            self.ship.orientation = int(float(m.group(9)))
        self.fortress = Object()
        self.fortress.alive = m.group(13) == 'y';
        self.fortress.position = [355, 315]
        if self.fortress.alive:
            self.fortress.orientation = int(float(m.group(14)))
        self.missiles = self.parse_projectiles(m.group(15))
        self.shells = self.parse_projectiles(m.group(16))
        self.points = int(m.group(18))
        self.vlner = int(m.group(21))
        # self.active = m.group(33) == 'y';
        self.fire = m.group(29) == 'y'
        self.thrust = m.group(26) == 'y'
        # self.fortress.timer = int(m.group(33))

def parse_file(file):
    loglines = []
    with open(file, "r") as dat:
        for line in dat:
            if not re.match("#", line):
                loglines.append(LogLine(line))
    return loglines

def compare_projectiles(a, b):
    if len(a) != len(b):
        return 'len'
    for i in range(len(a)):
        if a[i].position[0] != b[i].position[0] or a[i].position[1] != b[i].position[1]:
            return 'pos'
    return True

def compare(a, b):
    acc = []
    cm = compare_projectiles(a.missiles, b.missiles)
    cs = compare_projectiles(a.shells, b.shells)
    if a.ship.alive != b.ship.alive:
        acc.append('sa')
    if a.ship.alive and b.ship.alive and a.ship.orientation != b.ship.orientation:
        acc.append('so')
    if a.ship.position != b.ship.position:
        acc.append('sp %s != %s'%(a.ship.position, b.ship.position))
    if a.ship.alive and b.ship.alive and a.ship.velocity != b.ship.velocity:
        acc.append('sv')
    if cm != True:
        acc.append('m_'+cm)
    if cs != True:
        acc.append('sh_'+cs)
    if a.points != b.points:
        acc.append('points')
    if a.vlner != b.vlner:
        acc.append('vlner')
    if a.fortress.alive != b.fortress.alive:
        acc.append('f')
    if a.fortress.alive and b.fortress.alive and a.fortress.orientation != b.fortress.orientation:
        acc.append('fo')
    # if a.fortress.timer != b.fortress.timer:
    #     acc.append('ft %d != %d'%(a.fortress.timer, b.fortress.timer))
    return acc


if __name__ == '__main__':
    f1 = parse_file(sys.argv[1])
    f2 = parse_file(sys.argv[2])

    assert len(f1) == len(f2)

    for i in range(len(f1)):
        ret = compare(f1[i], f2[i])
        if len(ret):
            print f1[i].timestamp, f2[i].timestamp, ret
