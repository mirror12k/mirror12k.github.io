
from quantum import *

run_content = Element("run-content")
circuit_diagram = Element("circuit-diagram")


def run_quantum(*args, **kws):
	prog = run_content.element.value

	print("##################################################")
	# fun = parse_instructions_block(prog)
	m = compile_instructions_block_matrix2(4, prog)
	s = compile_instructions_str(4, prog)
	circuit_diagram.element.innerText = s
	print(s)
	for t in MultiTensor.from_pattern(4)._t:
		print(t, '->', t * m)
