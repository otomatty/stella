public class Q29LargerAbsTests
{
    [Theory(DisplayName = "Q29 符号を無視した大きい方（絶対値が大きい方。同じなら先の引数）")]
    [InlineData(3, -10, -10)]
    [InlineData(-3, 4, 4)]
    [InlineData(5, -5, 5)]
    public void Q29LargerAbs(int a, int b, int expected)
    {
        Assert.Equal(expected, Answers.Q29LargerAbs(a, b));
    }
}
