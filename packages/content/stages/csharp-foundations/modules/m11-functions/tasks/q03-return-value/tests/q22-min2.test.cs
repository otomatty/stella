public class Q22Min2Tests
{
    [Fact(DisplayName = "Q22 小さい方")]
    public void Q22Min2()
    {
        Assert.Equal(3, Answers.Q22Min2(3, 10));
        Assert.Equal(3, Answers.Q22Min2(10, 3));
        Assert.Equal(4, Answers.Q22Min2(4, 4));
    }
}
