#!/bin/bash
# Supports: Multiple CPUs, Multiple GPUs

echo "=== LocalLlama Hardware Detection ==="
echo ""

# CPU(s) - handles multiple sockets
if [[ "$OSTYPE" == "darwin"* ]]; then
	CPU=$(sysctl -n machdep.cpu.brand_string 2>/dev/null)
	CORES=$(sysctl -n hw.ncpu)
	SOCKETS=$(sysctl -n hw.packages 2>/dev/null || echo "1")
	echo "CPU: $CPU"
	echo "Cores: $CORES"
	[[ "$SOCKETS" != "1" ]] && echo "Sockets: $SOCKETS"
else
	# Linux - handle multiple CPUs
	CPU_MODEL=$(grep 'model name' /proc/cpuinfo 2>/dev/null | head -1 | cut -d: -f2 | xargs)
	CORES=$(nproc 2>/dev/null)
	SOCKETS=$(lscpu 2>/dev/null | grep 'Socket(s):' | awk '{print $2}' || echo "1")
	echo "CPU: $CPU_MODEL"
	echo "Cores: $CORES"
	[[ "$SOCKETS" != "1" ]] && echo "Sockets: $SOCKETS (multi-CPU system)"
fi

# RAM
if [[ "$OSTYPE" == "darwin"* ]]; then
	RAM=$(($(sysctl -n hw.memsize) / 1024 / 1024 / 1024))
else
	RAM=$(grep MemTotal /proc/meminfo 2>/dev/null | awk '{print int($2/1024/1024 + 0.5)}')
fi
echo "RAM: ${RAM} GB"

# OS
echo "OS: $(uname -s) $(uname -r)"

# GPU(s) - handles multiple GPUs
echo ""
echo "GPU(s):"
if command -v nvidia-smi &>/dev/null; then
	nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>/dev/null | while IFS=',' read -r name mem; do
		echo "  - ${name} (${mem})"
	done
elif [[ "$OSTYPE" == "darwin"* ]]; then
	system_profiler SPDisplaysDataType 2>/dev/null | grep "Chipset Model" | while IFS=':' read -r _ model; do
		echo "  - ${model}"
	done
else
	# Try AMD ROCm
	if command -v rocm-smi &>/dev/null; then
		rocm-smi --showproductname 2>/dev/null | grep -E "^Card" | while read -r line; do
			echo "  - $line"
		done
	else
		echo "  (none detected - CPU only system)"
	fi
fi

echo ""
echo "---"
echo "Copy the above to your submission!"
