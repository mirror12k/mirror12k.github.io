
from quantum import *

run_content = Element("run-content")


def run_quantum(*args, **kws):
	prog = run_content.element.value

	print("##################################################")
	fun = parse_instructions_block(prog)
	for t in MultiTensor.from_pattern(4)._t:
		print(t, '->', fun(t))
