# import time

name = input("what is your name?") 
print('nice to meet you,', name)
# time.sleep(5)
# print('sleep off')
greet = input(f"how are you, {name}?")
print(greet)

while name != 'e':
  name = input("input something:")
  print('you input:', name)