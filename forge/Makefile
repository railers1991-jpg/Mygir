# Forge — Metamod plugin for CS 1.6 (GoldSrc).
#
# CS 1.6 servers are 32-bit, so the plugin must be built as a 32-bit .so.
# You need the Half-Life SDK and the Metamod headers; point these at them:
#
#   make HLSDK=/path/to/hlsdk METAMOD=/path/to/metamod-p/metamod
#
# On Debian/Ubuntu you also need the 32-bit toolchain:
#   sudo apt-get install g++-multilib
#
# Output: build/forge_mm_i386.so

HLSDK   ?= ../hlsdk
METAMOD ?= ../metamod-p/metamod

CXX     ?= g++
NAME     = forge_mm_i386.so
BUILDDIR = build
OUT      = $(BUILDDIR)/$(NAME)

INCLUDES = \
	-I$(METAMOD) \
	-I$(HLSDK)/common \
	-I$(HLSDK)/dlls \
	-I$(HLSDK)/engine \
	-I$(HLSDK)/pm_shared \
	-I$(HLSDK)/public \
	-Isrc -Isrc/sdk -Isrc/core -Isrc/modes

DEFINES = -DLINUX -D_LINUX -Dlinux -DNDEBUG -DPOSIX

CXXFLAGS = -m32 -fPIC -O2 -fno-strict-aliasing -fno-exceptions -fno-rtti \
           -Wno-write-strings -w -std=c++14 $(DEFINES) $(INCLUDES)
LDFLAGS  = -m32 -shared -ldl -lm

SRCS = $(wildcard src/sdk/*.cpp src/core/*.cpp src/modes/*.cpp)
OBJS = $(patsubst src/%.cpp,$(BUILDDIR)/%.o,$(SRCS))

all: $(OUT)

$(OUT): $(OBJS)
	@mkdir -p $(dir $@)
	$(CXX) $(LDFLAGS) -o $@ $(OBJS)
	@echo "==> built $@"

$(BUILDDIR)/%.o: src/%.cpp
	@mkdir -p $(dir $@)
	$(CXX) $(CXXFLAGS) -c $< -o $@

clean:
	rm -rf $(BUILDDIR)

.PHONY: all clean
