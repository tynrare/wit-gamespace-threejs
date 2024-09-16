# меню

# [main menu](#mainmenu)

# [bowling menu](#splashscreen_bowling)

## routes

- [tests menu](#testsmenu)
- [log](#log)

## tests

- [bowling](#testcase8)
- [test case 1](#testcase1)
- [танки](?#testcase2)
- [танки - первая карта](?map=a#testcase2)

`было сказано, что каждый случай отключения будет рассматриваться самим Куратором.`

# bowling congif

## _generic_

| key           | description                       |
| ------------- | --------------------------------- |
| `zoom_on_aim` | отдаление камеры при прицеливании |

## _pawn_behabiour_

| key                      | description                     |
| ------------------------ | ------------------------------- |
| `shoot_instant`          | мгновенный выстрел без чарджа   |
| `shoot_limit`            | максимальное количество зарядов |
| `shoot_limit_recharge`   | время перезарядки               |
| `hearts_limit`           | кол-во хп                       |
| `hearts_limit_recharge`  | время перезарядки хп            |
| `aim_direction_priority` | приоритет прицеливанию          |
| `stabilization_factor`   | сила вертикализации             |
| `projectile_scale`       | множитель размера снаряда       |
| `movespeed`              | скорость движения               |

## _projectile_

| key        | description                        |
| ---------- | ---------------------------------- |
| `lifespan` | время жизни                        |
| `impulse`  | сила броска                        |
| `ldamping` | сопротивление движения             |
| `density`  | плотность (масса=плотность\*объем) |
| `scale`    | множитель размера                  |
