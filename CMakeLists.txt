
cmake_minimum_required(VERSION 3.2)

project(l10ns)

set(VERSION "3.0")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++14")
set(EXECUTABLE_OUTPUT_PATH ${PROJECT_SOURCE_DIR}/Executables)

configure_file(${PROJECT_SOURCE_DIR}/Source/Program/Configurations.h.in ${PROJECT_SOURCE_DIR}/Source/Program/Configurations.h)

find_package(Boost 1.54 COMPONENTS system filesystem REQUIRED)

add_subdirectory(Source/Vendors/Glob)

include_directories("${PROJECT_SOURCE_DIR}/Source/Program")
include_directories("${PROJECT_SOURCE_DIR}/Source/Vendors/Glob")

add_executable(l10ns ${PROJECT_SOURCE_DIR}/Source/Program/Exec.cpp)
add_executable(run-tests ${PROJECT_SOURCE_DIR}/Source/TestFramework/Exec.cpp)

add_executable(accept-baseline ${PROJECT_SOURCE_DIR}/Tasks/AcceptBaseline.cpp)

target_link_libraries(l10ns glob ${Boost_LIBRARIES})
target_link_libraries(run-tests glob ${Boost_LIBRARIES})
target_link_libraries(accept-baseline glob ${Boost_LIBRARIES})
