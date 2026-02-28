FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies for data science
RUN pip install --no-cache-dir \
    pandas \
    numpy \
    matplotlib \
    seaborn \
    plotly \
    scikit-learn \
    requests \
    pillow \
    openpyxl \
    python-docx \
    PyPDF2 \
    beautifulsoup4 \
    lxml \
    ipython \
    jupyter \
    sympy \
    scipy \
    statsmodels

# Security: Run as non-root user
RUN useradd -m -u 1000 sandbox && chown -R sandbox:sandbox /app
USER sandbox

# Limit resources
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

CMD ["python", "-c", "print('Code Interpreter Ready')"]
