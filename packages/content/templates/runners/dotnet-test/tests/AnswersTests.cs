public class AnswersTests
{
    [Theory(DisplayName = "1 から N の合計")]
    [InlineData(4, 10)]
    [InlineData(1, 1)]
    [InlineData(10, 55)]
    public void Sum(int n, int expected)
    {
        Assert.Equal(expected, Answers.Sum(n));
    }

    [Fact(DisplayName = "1 から N を 1 行ずつ表示する")]
    public void CountUp()
    {
        Assert.Equal("1\n2\n3\n", ConsoleOutput.Capture(() => Answers.CountUp(3)));
    }

    [Fact(DisplayName = "n が 0 のときは何も表示しない")]
    public void CountUpZero()
    {
        Assert.Equal("", ConsoleOutput.Capture(() => Answers.CountUp(0)));
    }
}
