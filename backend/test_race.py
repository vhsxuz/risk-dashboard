import threading
import random
from app.schemas import RiskLevel

def job(name):
    random.seed(int(-6.3 * 106.8 * 1000))
    choices = [RiskLevel.RENDAH, RiskLevel.SEDANG, RiskLevel.TINGGI, RiskLevel.AMAN]
    print(f"{name}:", random.choice(choices))

t1 = threading.Thread(target=job, args=("T1",))
t2 = threading.Thread(target=job, args=("T2",))
t1.start()
t2.start()
t1.join()
t2.join()
