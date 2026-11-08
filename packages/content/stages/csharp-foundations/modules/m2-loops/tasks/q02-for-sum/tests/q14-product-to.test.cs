public class Q14ProductToTests
{
    [Theory(DisplayName = "Q14 1から N の積")]
    [InlineData(4, 24)]
    [InlineData(1, 1)]
    [InlineData(5, 120)]
    public void Q14ProductTo(int n, int expected)
    {
        Assert.Equal(expected, Answers.Q14ProductTo(n));
    }
}
