public class Q18RepeatAddTests
{
    [Theory(DisplayName = "Q18 Nを N 回足す")]
    [InlineData(4, 16)]
    [InlineData(1, 1)]
    [InlineData(5, 25)]
    public void Q18RepeatAdd(int n, int expected)
    {
        Assert.Equal(expected, Answers.Q18RepeatAdd(n));
    }
}
