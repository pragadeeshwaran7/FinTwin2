# QLSTM

Flow for training:

```
data.py -> preprocessing.py -> sequences.py -> train.py -> utils.py (optional save)
```

Flow for serving:

```
serve.py -> utils.py (load model) -> preprocessing.py (compute indicators) -> forecast.py (iterative forecast)
```