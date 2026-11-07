public class Q22Min5Tests
{
    [Theory(DisplayName = "Q22 5つの最小")]
    [InlineData(3, 9, 4, 11, 6, 3)]
    [InlineData(11, 3, 4, 2, 8, 2)]
    [InlineData(5, 5, 5, 5, 5, 5)]
    public void Q22Min5(int a, int b, int c, int d, int e, int expected)
    {
        Assert.Equal(expected, Answers.Q22Min5(a, b, c, d, e));
    }
}
