public class Q25Max4Tests
{
    [Theory(DisplayName = "Q25 4つの最大")]
    [InlineData(8, 2, 5, 2, 8)]
    [InlineData(1, 4, 4, 0, 4)]
    [InlineData(7, 7, 7, 7, 7)]
    public void Q25Max4(int a, int b, int c, int d, int expected)
    {
        Assert.Equal(expected, Answers.Q25Max4(a, b, c, d));
    }
}
